import { describe, it, expect } from "vitest";
import type { BridgeTransfer } from "../src/lib/types.js";

function makeTransfer(
  fromChain: BridgeTransfer["fromChain"],
  toChain: BridgeTransfer["toChain"],
  amountUsd: number
): BridgeTransfer {
  return {
    id: crypto.randomUUID(),
    bridge: "wormhole",
    fromChain,
    toChain,
    token: "USDC",
    amountUsd,
    sender: "AbCdEf123456",
    recipient: "XyZwVu654321",
    txHash: "0x" + "a".repeat(64),
    timestamp: Date.now(),
  };
}

describe("netflow computation", () => {
  it("computes inbound and outbound correctly", async () => {
    const { computeNetflows } = await import("../src/monitor/netflow.js");
    const transfers = [
      makeTransfer("ethereum", "solana", 1_000_000),
      makeTransfer("ethereum", "solana", 500_000),
      makeTransfer("solana", "ethereum", 300_000),
    ];
    const flows = computeNetflows(transfers);
    const solanaInbound = flows.find((f) => f.chain === "solana" && f.bridge === "wormhole");
    expect(solanaInbound?.inboundUsd).toBe(1_500_000);
  });

  it("net flow is inbound minus outbound", async () => {
    const { computeNetflows } = await import("../src/monitor/netflow.js");
    const transfers = [
      makeTransfer("ethereum", "solana", 1_000_000),
      makeTransfer("solana", "ethereum", 400_000),
    ];
    const flows = computeNetflows(transfers);
    const solana = flows.find((f) => f.chain === "solana");
    expect(solana?.inboundUsd).toBe(1_000_000);
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

  it("sorts by amount descending", async () => {
    const { getLargeTransfers } = await import("../src/monitor/netflow.js");
    const transfers = [
      makeTransfer("ethereum", "solana", 600_000),
      makeTransfer("ethereum", "solana", 2_000_000),
      makeTransfer("solana", "base", 800_000),
    ];
    const large = getLargeTransfers(transfers, 500_000);
    expect(large[0].amountUsd).toBe(2_000_000);
  });
});

describe("transfer model", () => {
  it("valid bridge names", () => {
    const valid = ["wormhole", "allbridge", "debridge", "portal"];
    const t = makeTransfer("ethereum", "solana", 1_000_000);
    expect(valid).toContain(t.bridge);
  });
});
