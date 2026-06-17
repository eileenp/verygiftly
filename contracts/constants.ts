export const Session = {
  cookieName: "kimi_sid",
  maxAgeMs: 24 * 60 * 60 * 1000,
  // CSRF nonce cookie for the OAuth flow (double-submit against `state`).
  oauthStateCookie: "verygiftly_oauth_state",
} as const;

export const ErrorMessages = {
  unauthenticated: "Authentication required",
  insufficientRole: "Insufficient permissions",
} as const;

export const Paths = {
  login: "/login",
  oauthCallback: "/api/oauth/callback",
} as const;
