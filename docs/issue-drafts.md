# Issue Drafts

## Issue 1

Title: `Route concentration should be segmented by token class`

Body:
Right now concentration is measured on total inbound flow. That hides cases where stablecoin flow is diverse but meme-token inventory is coming through one route. We should calculate concentration separately for stablecoins and non-stable assets.

## Issue 2

Title: `Need same-sender roundtrip detection across bridge wrappers`

Body:
The current roundtrip logic will miss inventory churn when a desk uses multiple wrapper addresses or recipient relays. We should cluster sender-recipient patterns so transient flow does not get mislabeled as fresh deployment.
