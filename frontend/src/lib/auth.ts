import Cookies from "js-cookie";

import type { TokenResponse } from "./types";

const ACCESS_TOKEN_KEY = "vindicta_access_token";
const REFRESH_TOKEN_KEY = "vindicta_refresh_token";

export function getAccessToken(): string | undefined {
  return Cookies.get(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | undefined {
  return Cookies.get(REFRESH_TOKEN_KEY);
}

export function setTokens(tokens: TokenResponse): void {
  Cookies.set(ACCESS_TOKEN_KEY, tokens.access_token, {
    expires: 1,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  Cookies.set(REFRESH_TOKEN_KEY, tokens.refresh_token, {
    expires: 30,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearTokens(): void {
  Cookies.remove(ACCESS_TOKEN_KEY);
  Cookies.remove(REFRESH_TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}
