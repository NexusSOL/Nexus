import { describe, expect, it } from "vitest";
import type { BridgeTransfer } from "../src/lib/types.js";

function makeTransfer(
  fromChain: BridgeTransfer["fromChain"],
  toChain: BridgeTransfer["toChain"],
  amountUsd: number,
  stablecoin = true
): BridgeTransfer {
  return {
    id: crypto.randomUUID(),
    bridge: "wormhole",
    fromChain,
    toChain,
    token: stablecoin ? "USDC" : "SOL",
    amountUsd,
    sender: "AbCdEf123456",
    recipient: "XyZwVu654321",
    txHash: "0x" + "a".repeat(64),
    timestamp: Date.now(),
    stablecoin,
  };
}

describe("netflow computation", () => {
  it("computes stablecoin share on inbound Solana flow", async () => {
    const { computeNetflows } = await import("../src/monitor/netflow.js");
    const transfers = [
      makeTransfer("ethereum", "solana", 1_000_000, true),
      makeTransfer("base", "solana", 500_000, false),
    ];
    const flows = computeNetflows(transfers);
    const solana = flows.find((flow) => flow.chain === "solana" && flow.bridge === "wormhole");
    expect(solana?.stablecoinSharePct).toBeCloseTo(66.67, 1);
  });

  it("tracks route concentration", async () => {
    const { computeNetflows } = await import("../src/monitor/netflow.js");
    const transfers = [
      makeTransfer("ethereum", "solana", 1_000_000),
      makeTransfer("ethereum", "solana", 500_000),
      makeTransfer("base", "solana", 250_000),
    ];
    const flows = computeNetflows(transfers);
    const solana = flows.find((flow) => flow.chain === "solana");
    expect(solana?.routeConcentrationPct).toBeGreaterThan(60);
  });
});

describe("large transfer detection", () => {
  it("filters below threshold", async () => {
    const { getLargeTransfers } = await import("../src/monitor/netflow.js");
    const transfers = [
      makeTransfer("ethereum", "solana", 100_000),
      makeTransfer("ethereum", "solana", 600_000),
      makeTransfer("solana", "base", 1_200_000),
    ];
    const large = getLargeTransfers(transfers, 500_000);
    expect(large).toHaveLength(2);
  });
});
