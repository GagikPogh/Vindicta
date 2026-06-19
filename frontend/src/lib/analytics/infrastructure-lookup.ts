export type AssetScanPhase = "idle" | "scanning" | "resolved";

export type TargetType = "ip" | "domain";

export interface InfrastructureReport {
  target: string;
  targetType: TargetType;
  confidence: number;
  asn: string;
  hostingProvider: string;
  registrar: string;
  org: string;
  dnsHistory: string[];
  sslCert: {
    issuer: string;
    validUntil: string;
    fingerprint: string;
  };
  openPorts: number[];
  geo: {
    city: string;
    country: string;
    isp: string;
    lat: number;
    lng: number;
  };
  reputation: {
    score: number;
    blocklists: string[];
  };
  tookMs: number;
}

const IP_REGEX = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const DOMAIN_REGEX = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

export function parseTarget(input: string): TargetType | null {
  const trimmed = input.trim().toLowerCase();
  if (IP_REGEX.test(trimmed)) return "ip";
  if (DOMAIN_REGEX.test(trimmed)) return "domain";
  return null;
}

function hashSeed(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const PROVIDERS = [
  "Cloudflare, Inc.",
  "Amazon Technologies Inc.",
  "Google LLC",
  "Microsoft Corporation",
  "Hetzner Online GmbH",
  "DigitalOcean, LLC",
];

const ISPS = [
  "Level 3 Communications",
  "Cogent Communications",
  "NTT America",
  "Zayo Bandwidth",
];

const CITIES = [
  { city: "Ashburn", country: "US", lat: 39.0438, lng: -77.4874 },
  { city: "Frankfurt", country: "DE", lat: 50.1109, lng: 8.6821 },
  { city: "Singapore", country: "SG", lat: 1.3521, lng: 103.8198 },
  { city: "London", country: "GB", lat: 51.5074, lng: -0.1278 },
];

export function buildInfrastructureReport(target: string): InfrastructureReport {
  const normalized = target.trim().toLowerCase();
  const targetType = parseTarget(normalized)!;
  const seed = hashSeed(normalized);
  const provider = PROVIDERS[seed % PROVIDERS.length];
  const geo = CITIES[seed % CITIES.length];
  const asn = `AS${15169 + (seed % 40000)}`;
  const confidence = 72 + (seed % 27);

  const dnsHistory =
    targetType === "domain"
      ? [
          `${normalized} → A ${geo.lat > 0 ? "104.21" : "172.67"}.${seed % 255}.${seed % 200}`,
          `mail.${normalized} → MX 10 mx1.${normalized.split(".").slice(-2).join(".")}`,
          `www.${normalized} → CNAME ${normalized}`,
        ]
      : [
          `PTR ${normalized} → node-${seed % 999}.cdn.net`,
          `A ${normalized} → ${normalized}`,
        ];

  const ports = [22, 80, 443, 8080, 8443].filter((_, i) => (seed >> i) % 2 === 0);

  return {
    target: normalized,
    targetType,
    confidence,
    asn,
    hostingProvider: provider,
    registrar: targetType === "domain" ? "MarkMonitor Inc." : "ARIN",
    org: provider.split(",")[0],
    dnsHistory,
    sslCert: {
      issuer: "Let's Encrypt Authority X3",
      validUntil: "2026-09-14",
      fingerprint: `SHA256:${seed.toString(16).padStart(8, "0").toUpperCase()}…${(seed * 7).toString(16).slice(0, 8).toUpperCase()}`,
    },
    openPorts: ports.length ? ports : [443],
    geo: {
      city: geo.city,
      country: geo.country,
      isp: ISPS[seed % ISPS.length],
      lat: geo.lat,
      lng: geo.lng,
    },
    reputation: {
      score: Math.max(12, 100 - confidence),
      blocklists: seed % 3 === 0 ? ["Spamhaus DROP", "AbuseIPDB"] : [],
    },
    tookMs: 1800 + (seed % 1200),
  };
}

export async function lookupInfrastructure(target: string): Promise<InfrastructureReport> {
  const type = parseTarget(target);
  if (!type) {
    throw new Error("Invalid target — enter a valid IPv4 address or domain name");
  }

  const delay = 2600 + (hashSeed(target) % 900);
  await new Promise((r) => setTimeout(r, delay));
  return buildInfrastructureReport(target);
}

export const DEMO_TARGETS = ["8.8.8.8", "1.1.1.1", "malicious-infrastructure.net", "cdn.edge-node.io"];
