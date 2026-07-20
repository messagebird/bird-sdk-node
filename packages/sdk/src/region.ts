// API keys encode their region as bk_{region}_{token}, so the client can route
// to {region}.platform.bird.com automatically (ADR-0036).

const REGION_PATTERN = /^[a-z]{2}[0-9]+$/;

/** Extracts the region code from a `bk_{region}_{token}` key, or undefined. */
export function regionFromApiKey(apiKey: string): string | undefined {
  const [prefix, region, token] = apiKey.split("_");
  if (prefix !== "bk" || !region || !token) return undefined;
  return REGION_PATTERN.test(region) ? region : undefined;
}

export function baseUrlForRegion(region: string): string {
  return `https://${region}.platform.bird.com`;
}
