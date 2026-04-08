# Nexus

Bridge-ingress radar for Solana capital flows.

Nexus tracks whether bridged capital is actually deployable into Solana. Instead of treating every large transfer as signal, it scores stablecoin share, route concentration, and net Solana ingress quality before escalating the event.

[![Build](https://img.shields.io/github/actions/workflow/status/NexusSOL/Nexus/ci.yml?branch=master&style=flat-square&label=Build)](https://github.com/NexusSOL/Nexus/actions)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square)

## Flow Map

![Nexus flow map](assets/preview-flow.svg)

## Ingress Alert

![Nexus anomaly card](assets/preview-anomaly.svg)

## Why Nexus Exists

Large bridge transfers are noisy on their own. The real question is whether capital is moving into Solana in a form that can be deployed quickly into memes, DeFi, or funding rotations.

## Technical Spec

### Core Metrics

- `netUsd = inboundUsd - outboundUsd`
- `stablecoinSharePct = stablecoinInboundUsd / inboundUsd`
- `routeConcentrationPct = largestInboundRouteUsd / inboundUsd`

### Detection Logic

- High `netUsd` into Solana with high `stablecoinSharePct` implies deployable capital.
- High `routeConcentrationPct` means the event may be route-specific and crowded.
- Rapid roundtrip behavior lowers conviction because it often reflects inventory management or arb.

### Anomaly Types

- `solana_ingress`: broad inbound capital to Solana
- `deployable_stablecoin`: inbound flow dominated by stablecoins
- `route_concentration`: one route is carrying most of the flow
- `roundtrip_churn`: bridge activity looks transient rather than committed
- `suspicious_timing`: concentrated flow before a catalyst window

## Quick Start

```bash
git clone https://github.com/NexusSOL/Nexus
cd Nexus
npm install
cp .env.example .env
npm run dev
```

## Configuration

```bash
ANTHROPIC_API_KEY=sk-ant-...
WORMHOLE_API_KEY=...
LARGE_TRANSFER_THRESHOLD_USD=500000
MIN_SOLANA_INGRESS_USD=1000000
DEPLOYABLE_STABLECOIN_SHARE_PCT=45
ROUTE_CONCENTRATION_THRESHOLD_PCT=62
SCAN_INTERVAL_MS=120000
```

## Local Audit Docs

- [Commit sequence](docs/commit-sequence.md)
- [Issue drafts](docs/issue-drafts.md)

## License

MIT
