export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  oauth_provider: string;
  is_active: boolean;
  is_verified: boolean;
  preferences: Record<string, unknown>;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface Investigation {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  tags: string[];
  metadata: Record<string, unknown>;
  owner_id: string;
  created_at: string;
  updated_at: string;
  entity_count: number;
  event_count: number;
}

export interface Entity {
  id: string;
  name: string;
  entity_type: string;
  description?: string;
  properties: Record<string, unknown>;
  risk_score: number;
  investigation_id?: string;
  neo4j_id?: string;
  created_at: string;
  updated_at: string;
}

export interface SearchResult {
  id: string;
  name: string;
  entity_type: string;
  description?: string;
  risk_score: number;
  source: string;
  properties: Record<string, unknown>;
}

export interface SearchResponse {
  query: string;
  total: number;
  results: SearchResult[];
  took_ms: number;
}

export interface GraphNode {
  id: string;
  name: string;
  type: string;
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  properties: Record<string, unknown>;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  center_id?: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  event_type: string;
  occurred_at: string;
  properties: Record<string, unknown>;
  entity_ids: string[];
  investigation_id: string;
  created_at: string;
}

export interface Report {
  id: string;
  title: string;
  description?: string;
  status: string;
  content: Record<string, unknown>;
  investigation_id?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_investigations: number;
  active_investigations: number;
  total_entities: number;
  total_events: number;
  total_reports: number;
  high_risk_entities: number;
  recent_activity: Array<{
    type: string;
    id: string;
    title: string;
    status: string;
    timestamp: string;
  }>;
}

export interface ContactTag {
  id: string;
  tag_name: string;
  source: string;
  source_detail?: string;
  confidence: number;
  reported_by?: string;
  recorded_at: string;
  properties: Record<string, unknown>;
}

export interface SocialProfile {
  id: string;
  platform: string;
  username?: string;
  display_name?: string;
  profile_url: string;
  avatar_url?: string;
  source: string;
  confidence: number;
  is_verified: boolean;
  discovered_at: string;
  last_seen_at?: string;
  properties: Record<string, unknown>;
}

export interface SearchLink {
  platform: string;
  label: string;
  url: string;
  type: string;
}

export interface PhoneLookupResult {
  e164: string;
  query_raw: string;
  national?: string;
  is_valid: boolean;
  carrier?: {
    name?: string;
    line_type?: string;
    region?: string;
    country_code?: string;
  };
  contact_tags: ContactTag[];
  social_profiles: SocialProfile[];
  search_links: SearchLink[];
  risk_indicators: Array<{ type: string; label: string; severity: string }>;
  tag_count: number;
  profile_count: number;
  providers_used: string[];
  took_ms: number;
  cached?: boolean;
}

export interface PhoneLookupHistoryItem {
  id: string;
  e164: string;
  query_raw: string;
  tag_count: number;
  profile_count: number;
  created_at: string;
}

export interface WebNode {
  id: string;
  node_type: string;
  label: string;
  description?: string;
  x: number;
  y: number;
  color?: string;
  icon?: string;
  properties: Record<string, unknown>;
  is_pinned: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WebEdge {
  id: string;
  source_id: string;
  target_id: string;
  label: string;
  edge_type: string;
  properties: Record<string, unknown>;
  strength: number;
}

export interface InvestigationWeb {
  id: string;
  title: string;
  description?: string;
  revision: number;
  is_default: boolean;
  viewport: Record<string, unknown>;
  theme: Record<string, unknown>;
  nodes: WebNode[];
  edges: WebEdge[];
  updated_at: string;
}

export interface WebSyncResult {
  success: boolean;
  revision: number;
  conflict: boolean;
  web?: InvestigationWeb;
  message?: string;
}
