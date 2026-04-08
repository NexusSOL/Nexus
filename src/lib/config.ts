import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const schema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  WORMHOLE_API_KEY: z.string().optional(),
  CLAUDE_MODEL: z.string().default("claude-sonnet-4-6"),
  SCAN_INTERVAL_MS: z.coerce.number().default(120_000),
  LARGE_TRANSFER_THRESHOLD_USD: z.coerce.number().default(500_000),
  ROUTE_CONCENTRATION_THRESHOLD_PCT: z.coerce.number().default(62),
  MIN_SOLANA_INGRESS_USD: z.coerce.number().default(1_000_000),
  DEPLOYABLE_STABLECOIN_SHARE_PCT: z.coerce.number().default(45),
  ALERT_MIN_CONFIDENCE: z.coerce.number().default(0.65),
  TRACKED_BRIDGES: z.string().default("wormhole"),
  TRACKED_CHAINS: z.string().default("solana,ethereum,base,arbitrum"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Config error:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export const WORMHOLE_API = "https://api.wormholescan.io/api/v1";
