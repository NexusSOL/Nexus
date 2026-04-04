import { fetchWormholeTransfers } from "./src/bridges/wormhole.js";
import { computeNetflows, getLargeTransfers } from "./src/monitor/netflow.js";
import { runNexusAgent } from "./src/agent/loop.js";
import { config } from "./src/lib/config.js";
import { log } from "./src/lib/logger.js";
import type { BridgeAnomaly } from "./src/lib/types.js";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const RED = "\x1b[31m";
const ORANGE = "\x1b[33m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";

function printAnomalies(anomalies: BridgeAnomaly[]): void {
  const bar = "─".repeat(68);
  console.log(`\n${bar}`);
  console.log(`  ${BOLD}NEXUS — BRIDGE ANOMALY MONITOR${RESET}  (${anomalies.length} detected)`);
  console.log(bar);

  if (anomalies.length === 0) {
    console.log(`  ${DIM}no anomalies detected this cycle${RESET}`);
  } else {
    for (const a of anomalies) {
      const color = a.severity === "high" ? RED : a.severity === "medium" ? ORANGE : CYAN;
      const tx = a.transfer;
      console.log(`\n  ${BOLD}${color}[${a.severity.toUpperCase()}]${RESET} ${a.type.replace(/_/g, " ")}`);
      console.log(`     ${tx.fromChain} → ${tx.toChain}  ${tx.bridge}  ${tx.token}  $${(tx.amountUsd / 1000).toFixed(0)}K`);
      console.log(`     ${a.description}`);
      console.log(`     ${BOLD}→ ${a.recommendation}${RESET}`);
      console.log(`     ${DIM}conf=${a.confidence.toFixed(2)}  ${tx.txHash.slice(0, 12)}…${RESET}`);
    }
  }
  console.log(`\n${bar}\n`);
}

async function scan(): Promise<void> {
  log.info("Fetching Wormhole transfers...");
  const transfers = await fetchWormholeTransfers(2);
  const netflows = computeNetflows(transfers, 2);
  const large = getLargeTransfers(transfers, config.LARGE_TRANSFER_THRESHOLD_USD);

  log.info(`${transfers.length} transfers · ${large.length} large (>${config.LARGE_TRANSFER_THRESHOLD_USD / 1000}K)`);

  if (transfers.length === 0) return;

  const anomalies = await runNexusAgent(transfers, netflows);
  printAnomalies(anomalies);
}

async function main(): Promise<void> {
  log.info("Nexus v0.1.0 — bridge monitor starting");
  log.info(`Bridges: ${config.TRACKED_BRIDGES} · Threshold: $${config.LARGE_TRANSFER_THRESHOLD_USD.toLocaleString()}`);

  await scan();
  setInterval(() => scan().catch((e) => log.error("Scan error:", e)), config.SCAN_INTERVAL_MS);
}

main().catch((e) => { log.error("Fatal:", e); process.exit(1); });
