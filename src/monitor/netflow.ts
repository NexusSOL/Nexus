import type { BridgeTransfer, ChainNetflow, SupportedChain, BridgeName } from "../lib/types.js";

export function computeNetflows(transfers: BridgeTransfer[], windowHours = 1): ChainNetflow[] {
  const flowMap = new Map<string, ChainNetflow>();
  const inboundRouteMap = new Map<string, number>();

  for (const transfer of transfers) {
    const inboundKey = `${transfer.toChain}:${transfer.bridge}`;
    const inbound = flowMap.get(inboundKey) ?? {
      chain: transfer.toChain as SupportedChain,
      bridge: transfer.bridge as BridgeName,
      inboundUsd: 0,
      outboundUsd: 0,
      netUsd: 0,
      stablecoinInboundUsd: 0,
      stablecoinSharePct: 0,
      routeConcentrationPct: 0,
      transferCount: 0,
      windowHours,
      updatedAt: Date.now(),
    };
    inbound.inboundUsd += transfer.amountUsd;
    if (transfer.stablecoin) inbound.stablecoinInboundUsd += transfer.amountUsd;
    inbound.transferCount++;
    flowMap.set(inboundKey, inbound);

    const routeKey = `${transfer.toChain}:${transfer.bridge}:${transfer.fromChain}`;
    inboundRouteMap.set(routeKey, (inboundRouteMap.get(routeKey) ?? 0) + transfer.amountUsd);

    const outboundKey = `${transfer.fromChain}:${transfer.bridge}`;
    const outbound = flowMap.get(outboundKey) ?? {
      chain: transfer.fromChain as SupportedChain,
      bridge: transfer.bridge as BridgeName,
      inboundUsd: 0,
      outboundUsd: 0,
      netUsd: 0,
      stablecoinInboundUsd: 0,
      stablecoinSharePct: 0,
      routeConcentrationPct: 0,
      transferCount: 0,
      windowHours,
      updatedAt: Date.now(),
    };
    outbound.outboundUsd += transfer.amountUsd;
    outbound.transferCount++;
    flowMap.set(outboundKey, outbound);
  }

  for (const flow of flowMap.values()) {
    flow.netUsd = flow.inboundUsd - flow.outboundUsd;
    flow.stablecoinSharePct = flow.inboundUsd > 0 ? (flow.stablecoinInboundUsd / flow.inboundUsd) * 100 : 0;
    const inboundRoutes = Array.from(inboundRouteMap.entries())
      .filter(([route]) => route.startsWith(`${flow.chain}:${flow.bridge}:`))
      .map(([, amount]) => amount);
    const maxRoute = inboundRoutes.length > 0 ? Math.max(...inboundRoutes) : 0;
    flow.routeConcentrationPct = flow.inboundUsd > 0 ? (maxRoute / flow.inboundUsd) * 100 : 0;
  }

  return Array.from(flowMap.values()).sort((left, right) => Math.abs(right.netUsd) - Math.abs(left.netUsd));
}

export function getLargeTransfers(transfers: BridgeTransfer[], thresholdUsd: number): BridgeTransfer[] {
  return transfers
    .filter((transfer) => transfer.amountUsd >= thresholdUsd)
    .sort((left, right) => right.amountUsd - left.amountUsd);
}
