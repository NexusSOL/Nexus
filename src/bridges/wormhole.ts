import type { BridgeTransfer, SupportedChain } from "../lib/types.js";
import { config, WORMHOLE_API } from "../lib/config.js";

const WORMHOLE_CHAIN_MAP: Record<number, SupportedChain> = {
  1: "solana",
  2: "ethereum",
  30: "base",
  23: "arbitrum",
  21: "sui",
};

interface WormholeTransaction {
  id: string;
  emitterChain: number;
  targetChain: number;
  tokenAmount: string;
  usdAmount: string;
  tokenSymbol: string;
  emitterAddress: string;
  toAddress: string;
  txHash: string;
  timestamp: string;
  status: string;
}

export async function fetchWormholeTransfers(hours = 1): Promise<BridgeTransfer[]> {
  const from = new Date(Date.now() - hours * 3600_000).toISOString();
  const url = `${WORMHOLE_API}/transactions?size=50&from=${from}&sortOrder=DESC`;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (config.WORMHOLE_API_KEY) headers["X-API-Key"] = config.WORMHOLE_API_KEY;

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Wormhole API ${res.status}`);

  const data = await res.json() as { transactions: WormholeTransaction[] };
  const transfers: BridgeTransfer[] = [];

  for (const tx of data.transactions ?? []) {
    const fromChain = WORMHOLE_CHAIN_MAP[tx.emitterChain];
    const toChain = WORMHOLE_CHAIN_MAP[tx.targetChain];
    if (!fromChain || !toChain) continue;

    const amountUsd = parseFloat(tx.usdAmount ?? "0");
    if (amountUsd <= 0) continue;

    transfers.push({
      id: tx.id,
      bridge: "wormhole",
      fromChain,
      toChain,
      token: tx.tokenSymbol ?? "UNKNOWN",
      amountUsd,
      sender: tx.emitterAddress,
      recipient: tx.toAddress ?? "",
      txHash: tx.txHash,
      timestamp: new Date(tx.timestamp).getTime(),
    });
  }

  return transfers;
}
