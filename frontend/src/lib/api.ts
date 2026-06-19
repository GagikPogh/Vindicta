import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "./auth";
import { API_URL } from "./types";
import type {
  DashboardStats,
  Entity,
  GraphResponse,
  Investigation,
  InvestigationWeb,
  PhoneLookupHistoryItem,
  PhoneLookupResult,
  Report,
  WebSyncResult,
  SearchResponse,
  TimelineEvent,
  TokenResponse,
  User,
  WebEdge,
  WebNode,
} from "./types";

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    clearTokens();
    return null;
  }

  const tokens: TokenResponse = await response.json();
  setTokens(tokens);
  return tokens.access_token;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && retry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return request<T>(path, options, false);
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new ApiError(
      typeof error.detail === "string" ? error.detail : JSON.stringify(error.detail),
      response.status
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  auth: {
    register: (email: string, password: string, full_name: string) =>
      request<TokenResponse>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, full_name }),
      }),

    login: (email: string, password: string) =>
      request<TokenResponse>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),

    me: () => request<User>("/api/v1/auth/me"),

    getGoogleUrl: (redirectUri: string) =>
      request<{ url: string }>(`/api/v1/auth/google/url?redirect_uri=${encodeURIComponent(redirectUri)}`),

    googleCallback: (code: string, redirectUri: string) =>
      request<TokenResponse>("/api/v1/auth/google/callback", {
        method: "POST",
        body: JSON.stringify({ code, redirect_uri: redirectUri }),
      }),

    getAppleUrl: (redirectUri: string) =>
      request<{ url: string }>(`/api/v1/auth/apple/url?redirect_uri=${encodeURIComponent(redirectUri)}`),

    appleCallback: (code: string, redirectUri: string) =>
      request<TokenResponse>("/api/v1/auth/apple/callback", {
        method: "POST",
        body: JSON.stringify({ code, redirect_uri: redirectUri }),
      }),

    logout: () => request<{ message: string }>("/api/v1/auth/logout", { method: "POST" }),
  },

  users: {
    updateProfile: (data: Partial<{ full_name: string; avatar_url: string; preferences: Record<string, unknown> }>) =>
      request<User>("/api/v1/users/me", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },

  dashboard: {
    getStats: () => request<DashboardStats>("/api/v1/dashboard/stats"),
  },

  investigations: {
    list: () => request<Investigation[]>("/api/v1/investigations"),
    get: (id: string) => request<Investigation>(`/api/v1/investigations/${id}`),
    create: (data: { title: string; description?: string; priority?: string; tags?: string[] }) =>
      request<Investigation>("/api/v1/investigations", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Investigation>) =>
      request<Investigation>(`/api/v1/investigations/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ message: string }>(`/api/v1/investigations/${id}`, { method: "DELETE" }),
    listEntities: (id: string) => request<Entity[]>(`/api/v1/investigations/${id}/entities`),
    createEntity: (id: string, data: Partial<Entity>) =>
      request<Entity>(`/api/v1/investigations/${id}/entities`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  search: {
    query: (q: string, params?: { entity_types?: string[]; investigation_id?: string; limit?: number }) =>
      request<SearchResponse>("/api/v1/search", {
        method: "POST",
        body: JSON.stringify({ query: q, ...params }),
      }),
  },

  graph: {
    getEntity: (entityId: string, depth?: number) =>
      request<GraphResponse>(`/api/v1/graph/${entityId}${depth ? `?depth=${depth}` : ""}`),
    getFull: () => request<GraphResponse>("/api/v1/graph"),
  },

  timeline: {
    list: (investigationId: string) =>
      request<TimelineEvent[]>(`/api/v1/timeline/investigation/${investigationId}`),
    create: (data: {
      title: string;
      description?: string;
      event_type: string;
      occurred_at: string;
      investigation_id: string;
      entity_ids?: string[];
      properties?: Record<string, unknown>;
    }) =>
      request<TimelineEvent>("/api/v1/timeline", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/api/v1/timeline/${id}`, { method: "DELETE" }),
  },

  reports: {
    list: () => request<Report[]>("/api/v1/reports"),
    get: (id: string) => request<Report>(`/api/v1/reports/${id}`),
    create: (data: { title: string; description?: string; investigation_id?: string }) =>
      request<Report>("/api/v1/reports", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    generate: (id: string) =>
      request<Report>(`/api/v1/reports/${id}/generate`, { method: "POST" }),
    delete: (id: string) =>
      request<{ message: string }>(`/api/v1/reports/${id}`, { method: "DELETE" }),
  },

  phone: {
    lookup: (phone: string) =>
      request<PhoneLookupResult>("/api/v1/phone/lookup", {
        method: "POST",
        body: JSON.stringify({ phone }),
      }),
    history: () => request<PhoneLookupHistoryItem[]>("/api/v1/phone/history"),
    addTag: (phone: string, tag_name: string, source_detail?: string) =>
      request<{ message: string }>("/api/v1/phone/tags", {
        method: "POST",
        body: JSON.stringify({ phone, tag_name, source_detail }),
      }),
    addProfile: (data: {
      phone: string;
      platform: string;
      profile_url: string;
      username?: string;
      display_name?: string;
    }) =>
      request<{ message: string }>("/api/v1/phone/profiles", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  web: {
    getDefault: () => request<InvestigationWeb>("/api/v1/web/default"),
    get: (id: string, sinceRevision?: number) =>
      request<InvestigationWeb>(
        `/api/v1/web/${id}${sinceRevision ? `?since_revision=${sinceRevision}` : ""}`
      ),
    list: () => request<Array<{ id: string; title: string; revision: number; node_count: number; edge_count: number; updated_at: string }>>("/api/v1/web"),
    sync: (id: string, data: {
      revision: number;
      viewport?: Record<string, unknown>;
      nodes: WebNode[];
      edges: WebEdge[];
      deleted_node_ids?: string[];
      deleted_edge_ids?: string[];
    }) =>
      request<WebSyncResult>(`/api/v1/web/${id}/sync`, {
        method: "POST",
        body: JSON.stringify({
          ...data,
          deleted_node_ids: data.deleted_node_ids || [],
          deleted_edge_ids: data.deleted_edge_ids || [],
        }),
      }),
    create: (title: string, description?: string) =>
      request<InvestigationWeb>("/api/v1/web", {
        method: "POST",
        body: JSON.stringify({ title, description }),
      }),
  },
};

export { ApiError };
