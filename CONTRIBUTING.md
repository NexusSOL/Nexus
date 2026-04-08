# Contributing

## Local Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Contribution Rules

- keep bridge feed work separate from ranking and presentation changes
- include tests when ingress thresholds or anomaly types change
- prefer dashboard-like SVG updates over conceptual maps

## Pull Request Notes

- explain which ingress metric changed
- include a sample alert or route-ranking shift
- update README and runbook if the operator console changes
