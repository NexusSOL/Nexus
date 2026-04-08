import Anthropic from "@anthropic-ai/sdk";
import type { BridgeTransfer, BridgeAnomaly, ChainNetflow, AnomalyType } from "../lib/types.js";
import { NEXUS_SYSTEM } from "./prompts.js";
import { config } from "../lib/config.js";
import { log } from "../lib/logger.js";
import crypto from "crypto";

const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

const tools: Anthropic.Tool[] = [
  {
    name: "get_transfer_overview",
    description: "Get a summary of bridge transfers and Solana ingress quality for this cycle",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_large_transfers",
    description: "Get all transfers above the large transfer threshold",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_chain_netflows",
    description: "Get net flow, stablecoin share, and route concentration per chain",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_transfer_detail",
    description: "Get full details for a specific transfer by ID",
    input_schema: {
      type: "object" as const,
      properties: { transfer_id: { type: "string" } },
      required: ["transfer_id"],
    },
  },
  {
    name: "emit_anomaly",
    description: "Flag a bridge-ingress anomaly",
    input_schema: {
      type: "object" as const,
      properties: {
        transfer_id: { type: "string" },
        type: { type: "string", enum: ["solana_ingress", "roundtrip_churn", "route_concentration", "suspicious_timing", "deployable_stablecoin"] },
        severity: { type: "string", enum: ["low", "medium", "high"] },
        description: { type: "string" },
        recommendation: { type: "string" },
        confidence: { type: "number" },
      },
      required: ["transfer_id", "type", "severity", "description", "recommendation", "confidence"],
    },
  },
];

export async function runNexusAgent(transfers: BridgeTransfer[], netflows: ChainNetflow[]): Promise<BridgeAnomaly[]> {
  const anomalies: BridgeAnomaly[] = [];
  const byId = new Map(transfers.map((transfer) => [transfer.id, transfer]));
  const large = transfers.filter((transfer) => transfer.amountUsd >= config.LARGE_TRANSFER_THRESHOLD_USD);

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Scan complete. ${transfers.length} bridge transfers in the last 2h. Focus on Solana ingress quality, stablecoin deployability, and crowded routes.`,
    },
  ];

  for (let turn = 0; turn < 12; turn++) {
    const response = await client.messages.create({
      model: config.CLAUDE_MODEL,
      max_tokens: 4096,
      system: NEXUS_SYSTEM,
      tools,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });
    if (response.stop_reason !== "tool_use") break;

    const results: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      const input = block.input as Record<string, unknown>;
      let result = "";

      if (block.name === "get_transfer_overview") {
        const solanaFlow = netflows.find((flow) => flow.chain === "solana" && flow.netUsd > 0);
        result = JSON.stringify({
          totalTransfers: transfers.length,
          largeTransfers: large.length,
          solanaNetUsd: solanaFlow ? `$${(solanaFlow.netUsd / 1_000_000).toFixed(2)}M` : "$0.00M",
          stablecoinSharePct: solanaFlow?.stablecoinSharePct.toFixed(1) ?? "0.0",
          routeConcentrationPct: solanaFlow?.routeConcentrationPct.toFixed(1) ?? "0.0",
        });
      } else if (block.name === "get_large_transfers") {
        result = JSON.stringify(large.map((transfer) => ({
          id: transfer.id,
          route: `${transfer.fromChain}->${transfer.toChain}`,
          token: transfer.token,
          amountUsd: `$${(transfer.amountUsd / 1_000).toFixed(0)}K`,
          stablecoin: transfer.stablecoin,
          bridge: transfer.bridge,
        })));
      } else if (block.name === "get_chain_netflows") {
        result = JSON.stringify(netflows.map((flow) => ({
          chain: flow.chain,
          bridge: flow.bridge,
          netUsd: `${flow.netUsd >= 0 ? "+" : ""}$${(flow.netUsd / 1_000).toFixed(0)}K`,
          stablecoinSharePct: flow.stablecoinSharePct.toFixed(1),
          routeConcentrationPct: flow.routeConcentrationPct.toFixed(1),
        })));
      } else if (block.name === "get_transfer_detail") {
        const transfer = byId.get(input.transfer_id as string);
        result = transfer ? JSON.stringify(transfer) : "not found";
      } else if (block.name === "emit_anomaly") {
        const transfer = byId.get(input.transfer_id as string);
        if (!transfer) {
          result = "transfer not found";
          continue;
        }
        if ((input.confidence as number) < config.ALERT_MIN_CONFIDENCE) {
          result = JSON.stringify({ accepted: false, reason: "below confidence threshold" });
          continue;
        }
        const anomaly: BridgeAnomaly = {
          id: crypto.randomUUID(),
          type: input.type as AnomalyType,
          transfer,
          severity: input.severity as BridgeAnomaly["severity"],
          description: input.description as string,
          recommendation: input.recommendation as string,
          confidence: input.confidence as number,
          detectedAt: Date.now(),
        };
        anomalies.push(anomaly);
        log.warn(`Anomaly [${anomaly.severity}] ${anomaly.type} ${transfer.fromChain}->${transfer.toChain} $${(transfer.amountUsd / 1_000).toFixed(0)}K`);
        result = JSON.stringify({ id: anomaly.id, accepted: true });
      }

      results.push({ type: "tool_result", tool_use_id: block.id, content: result });
    }

    messages.push({ role: "user", content: results });
  }

  return anomalies;
}
