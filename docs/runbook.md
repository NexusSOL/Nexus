# Nexus Runbook

## What Nexus Is For

Nexus is used to tell the difference between bridge noise and capital that actually lands on Solana ready to deploy.

## Daily Operator Loop

1. Run `npm run dev`.
2. Read the topline strip for net landed flow and stablecoin share.
3. Check the route leaderboard for the corridor carrying the real size.
4. Promote only the flows that still look deployable after landing.

## What Gets Promoted

- large landed stablecoin flow
- corridor share that is strong but not obviously crowded
- low idle-inventory risk after arrival

## What Gets Demoted

- circular bridge churn
- parked inventory with no follow-through
- one-route spikes that look too crowded to deploy into
