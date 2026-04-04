import type { BridgeTransfer, ChainNetflow, SupportedChain, BridgeName } from "../lib/types.js";

export function computeNetflows(transfers: BridgeTransfer[], windowHours = 1): ChainNetflow[] {
  const flowMap = new Map<string, ChainNetflow>();

  for (const tx of transfers) {
    const key = `${tx.toChain}:${tx.bridge}`;
    const entry = flowMap.get(key) ?? {
      chain: tx.toChain as SupportedChain,
      bridge: tx.bridge as BridgeName,
      inboundUsd: 0,
      outboundUsd: 0,
      netUsd: 0,
      transferCount: 0,
      windowHours,
      updatedAt: Date.now(),
    };
    entry.inboundUsd += tx.amountUsd;
    entry.transferCount++;
    flowMap.set(key, entry);

    const fromKey = `${tx.fromChain}:${tx.bridge}`;
    const fromEntry = flowMap.get(fromKey) ?? {
      chain: tx.fromChain as SupportedChain,
      bridge: tx.bridge as BridgeName,
      inboundUsd: 0,
      outboundUsd: 0,
      netUsd: 0,
      transferCount: 0,
      windowHours,
      updatedAt: Date.now(),
    };
    fromEntry.outboundUsd += tx.amountUsd;
    flowMap.set(fromKey, fromEntry);
  }

  for (const flow of flowMap.values()) {
    flow.netUsd = flow.inboundUsd - flow.outboundUsd;
  }

  return Array.from(flowMap.values()).sort((a, b) => Math.abs(b.netUsd) - Math.abs(a.netUsd));
}

export function getLargeTransfers(transfers: BridgeTransfer[], thresholdUsd: number): BridgeTransfer[] {
  return transfers
    .filter((t) => t.amountUsd >= thresholdUsd)
    .sort((a, b) => b.amountUsd - a.amountUsd);
}
