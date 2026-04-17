# Corridor Share Weighting

Nexus tracks bridge ingress, so corridor share should be weighted by deployable value rather than raw transfer count.

## Weight higher when

- The incoming asset mix is already usable inside Solana venues.
- The source corridor has shown repeatable follow-on deployment.
- Stablecoin share is high enough to matter for near-term liquidity.

## Weight lower when

- The flow is mostly wrappers that still need several conversions.
- One-off bridge bursts dominate the sample.
- The corridor is active but historically sticky, with little downstream movement.

## Practical use

The scoreboard should highlight where capital is most likely to become actionable, not just where messages crossed a bridge.
