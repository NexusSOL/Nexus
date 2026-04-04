<div align="center">

# Nexus

**Cross-chain bridge intelligence.**
Monitors every major bridge between Solana and EVM chains. Detects large transfers, unusual flows, and anomalies before they move markets.

[![Build](https://img.shields.io/github/actions/workflow/status/NexusSOL/Nexus/ci.yml?branch=main&style=flat-square&label=Build)](https://github.com/NexusSOL/Nexus/actions)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)
[![Built with Claude Agent SDK](https://img.shields.io/badge/Built%20with-Claude%20Agent%20SDK-cc7800?style=flat-square)](https://docs.anthropic.com/en/docs/agents-and-tools/claude-agent-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square)](https://www.typescriptlang.org/)

</div>

---

Large asset movements don't happen in a vacuum. When $3.8M moves from Ethereum to Solana in a single transaction, something is about to happen — a large DeFi deployment, a protocol farming event, or institutional accumulation. The bridge sees it first.

`Nexus` monitors Wormhole and Allbridge every 2 minutes, computes net flow direction per chain, and flags transfers that exceed size or pattern thresholds. Claude classifies each anomaly: large transfer, rapid roundtrip, unusual chain, suspicious timing. High-severity events are escalated immediately.

```
FETCH → NETFLOW → DETECT → CLASSIFY → ALERT
```

---

## Bridge Flow Map

![Nexus Flow](assets/preview-flow.svg)

---

## Anomaly Alert

![Nexus Anomaly](assets/preview-anomaly.svg)

---

## Architecture

```
┌──────────────────────────────────────────────┐
│          Bridge Data Feeds                    │
│  Wormhole Scan API · Allbridge API           │
│  Transfer history · amounts · routes         │
└──────────────────────┬───────────────────────┘
                       ▼
┌──────────────────────────────────────────────┐
│         Netflow Monitor                       │
│  Inbound/outbound per chain · net flows      │
│  Large transfer detection · threshold filter │
└──────────────────────┬───────────────────────┘
                       ▼
┌──────────────────────────────────────────────┐
│          Claude Nexus Agent                   │
│  get_transfer_overview → get_large_transfers │
│  → get_chain_netflows → emit_anomaly         │
└──────────────────────┬───────────────────────┘
                       ▼
┌──────────────────────────────────────────────┐
│           Anomaly Reporter                    │
│  Severity badge · route · recommendation     │
└──────────────────────────────────────────────┘
```

---

## Anomaly Types

| Type | Trigger | Why It Matters |
|------|---------|----------------|
| **large_transfer** | Single tx > $500K | Institutional move |
| **rapid_roundtrip** | Bridge out + back < 5min | Arb or suspicious |
| **volume_spike** | Bridge vol > 5x baseline | Coordinated movement |
| **unusual_chain** | Unexpected chain pair | New route = news |
| **suspicious_timing** | Large flow before major event | Front-running signal |

---

## Quick Start

```bash
git clone https://github.com/NexusBridge/Nexus
cd Nexus && bun install
cp .env.example .env
bun run dev
```

---

## Configuration

```bash
ANTHROPIC_API_KEY=sk-ant-...
WORMHOLE_API_KEY=...             # optional
LARGE_TRANSFER_THRESHOLD_USD=500000
TRACKED_BRIDGES=wormhole,allbridge
TRACKED_CHAINS=solana,ethereum,base,arbitrum
SCAN_INTERVAL_MS=120000
```

---

## License

MIT

---

*watch the bridges. know what's coming.*
