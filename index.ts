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
  const bar = "─".repeat(72);
  console.log(`\n${bar}`);
  console.log(`  ${BOLD}NEXUS -- SOLANA INGRESS RADAR${RESET}  (${anomalies.length} detected)`);
  console.log(bar);

  if (anomalies.length === 0) {
    console.log(`  ${DIM}no bridge-ingress anomalies detected this cycle${RESET}`);
  } else {
    for (const anomaly of anomalies) {
      const color = anomaly.severity === "high" ? RED : anomaly.severity === "medium" ? ORANGE : CYAN;
      const transfer = anomaly.transfer;
      console.log(`\n  ${BOLD}${color}[${anomaly.severity.toUpperCase()}]${RESET} ${anomaly.type.replace(/_/g, " ")}`);
      console.log(`     ${transfer.fromChain}->${transfer.toChain}  ${transfer.token}  $${(transfer.amountUsd / 1_000).toFixed(0)}K  stablecoin=${transfer.stablecoin ? "yes" : "no"}`);
      console.log(`     ${anomaly.description}`);
      console.log(`     ${BOLD}-> ${anomaly.recommendation}${RESET}`);
      console.log(`     ${DIM}conf=${anomaly.confidence.toFixed(2)}  ${transfer.txHash.slice(0, 12)}...${RESET}`);
    }
  }
  console.log(`\n${bar}\n`);
}

async function scan(): Promise<void> {
  log.info("Fetching Wormhole bridge transfers...");
  const transfers = await fetchWormholeTransfers(2);
  const netflows = computeNetflows(transfers, 2);
  const large = getLargeTransfers(transfers, config.LARGE_TRANSFER_THRESHOLD_USD);
  const solana = netflows.find((flow) => flow.chain === "solana" && flow.netUsd > 0);

  log.info(`${transfers.length} transfers | ${large.length} large | Solana net ${solana ? `$${(solana.netUsd / 1_000_000).toFixed(2)}M` : "$0.00M"}`);

  if (transfers.length === 0) return;

  const anomalies = await runNexusAgent(transfers, netflows);
  printAnomalies(anomalies);
}

async function main(): Promise<void> {
  log.info("Nexus v0.2.0 -- Solana bridge-ingress radar starting");
  log.info(`Min ingress: $${config.MIN_SOLANA_INGRESS_USD.toLocaleString()} | route concentration cap: ${config.ROUTE_CONCENTRATION_THRESHOLD_PCT}%`);

  await scan();
  setInterval(() => scan().catch((error) => log.error("Scan error:", error)), config.SCAN_INTERVAL_MS);
}

main().catch((error) => {
  log.error("Fatal:", error);
  process.exit(1);
});
