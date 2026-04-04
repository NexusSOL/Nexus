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
    description: "Get a summary of all bridge transfers this cycle: total volume, largest transfers, chain breakdown",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_large_transfers",
    description: "Get all transfers above the large transfer threshold",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_chain_netflows",
    description: "Get net flow direction (inbound/outbound) per chain this cycle",
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
    description: "Flag a bridge activity anomaly",
    input_schema: {
      type: "object" as const,
      properties: {
        transfer_id: { type: "string" },
        type: {
          type: "string",
          enum: ["large_transfer", "rapid_roundtrip", "unusual_chain", "suspicious_timing", "volume_spike"],
        },
        severity: { type: "string", enum: ["low", "medium", "high"] },
        description: { type: "string" },
        recommendation: { type: "string" },
        confidence: { type: "number" },
      },
      required: ["transfer_id", "type", "severity", "description", "recommendation", "confidence"],
    },
  },
];

export async function runNexusAgent(
  transfers: BridgeTransfer[],
  netflows: ChainNetflow[]
): Promise<BridgeAnomaly[]> {
  const anomalies: BridgeAnomaly[] = [];
  const byId = new Map(transfers.map((t) => [t.id, t]));
  const large = transfers.filter((t) => t.amountUsd >= config.LARGE_TRANSFER_THRESHOLD_USD);

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Scan complete. ${transfers.length} bridge transfers in last 2h. ${large.length} exceed $${(config.LARGE_TRANSFER_THRESHOLD_USD / 1000).toFixed(0)}K threshold. Analyze and flag anomalies.`,
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
        const totalUsd = transfers.reduce((a, t) => a + t.amountUsd, 0);
        result = JSON.stringify({
          totalTransfers: transfers.length,
          totalVolumeUsd: `$${(totalUsd / 1_000_000).toFixed(2)}M`,
          largeTransfers: large.length,
          bridges: [...new Set(transfers.map((t) => t.bridge))],
          chainPairs: transfers.slice(0, 5).map((t) => `${t.fromChain}→${t.toChain} $${(t.amountUsd / 1000).toFixed(0)}K`),
        });
      } else if (block.name === "get_large_transfers") {
        result = JSON.stringify(large.map((t) => ({
          id: t.id,
          route: `${t.fromChain}→${t.toChain}`,
          token: t.token,
          amountUsd: `$${(t.amountUsd / 1000).toFixed(0)}K`,
          bridge: t.bridge,
          sender: t.sender.slice(0, 12) + "…",
        })));
      } else if (block.name === "get_chain_netflows") {
        result = JSON.stringify(netflows.map((f) => ({
          chain: f.chain,
          bridge: f.bridge,
          inbound: `$${(f.inboundUsd / 1000).toFixed(0)}K`,
          outbound: `$${(f.outboundUsd / 1000).toFixed(0)}K`,
          net: `${f.netUsd >= 0 ? "+" : ""}$${(f.netUsd / 1000).toFixed(0)}K`,
        })));
      } else if (block.name === "get_transfer_detail") {
        const tx = byId.get(input.transfer_id as string);
        result = tx ? JSON.stringify(tx) : "not found";
      } else if (block.name === "emit_anomaly") {
        const tx = byId.get(input.transfer_id as string);
        if (!tx) { result = "transfer not found"; continue; }
        if ((input.confidence as number) < config.ALERT_MIN_CONFIDENCE) {
          result = JSON.stringify({ accepted: false, reason: "below confidence threshold" });
          continue;
        }
        const anomaly: BridgeAnomaly = {
          id: crypto.randomUUID(),
          type: input.type as AnomalyType,
          transfer: tx,
          severity: input.severity as BridgeAnomaly["severity"],
          description: input.description as string,
          recommendation: input.recommendation as string,
          confidence: input.confidence as number,
          detectedAt: Date.now(),
        };
        anomalies.push(anomaly);
        log.warn(`Anomaly [${anomaly.severity}] ${anomaly.type} — ${tx.fromChain}→${tx.toChain} $${(tx.amountUsd / 1000).toFixed(0)}K`);
        result = JSON.stringify({ id: anomaly.id, accepted: true });
      }

      results.push({ type: "tool_result", tool_use_id: block.id, content: result });
    }

    messages.push({ role: "user", content: results });
  }

  return anomalies;
}
