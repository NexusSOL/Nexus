export type SupportedChain = "solana" | "ethereum" | "base" | "arbitrum" | "sui";
export type BridgeName = "wormhole" | "allbridge" | "debridge" | "portal";
export type AnomalyType = "large_transfer" | "rapid_roundtrip" | "unusual_chain" | "suspicious_timing" | "volume_spike";

export interface BridgeTransfer {
  id: string;
  bridge: BridgeName;
  fromChain: SupportedChain;
  toChain: SupportedChain;
  token: string;
  amountUsd: number;
  sender: string;
  recipient: string;
  txHash: string;
  timestamp: number;
  completedAt?: number;
}

export interface ChainNetflow {
  chain: SupportedChain;
  bridge: BridgeName;
  inboundUsd: number;
  outboundUsd: number;
  netUsd: number;
  transferCount: number;
  windowHours: number;
  updatedAt: number;
}

export interface BridgeAnomaly {
  id: string;
  type: AnomalyType;
  transfer: BridgeTransfer;
  severity: "low" | "medium" | "high";
  description: string;
  recommendation: string;
  confidence: number;
  detectedAt: number;
}
