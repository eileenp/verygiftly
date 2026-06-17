import type { CookieOptions } from "hono/utils/cookie";

function isLocalhost(headers: Headers): boolean {
  const host = headers.get("host") || "";
  return host.startsWith("localhost:") || host.startsWith("127.0.0.1:");
}

export function getSessionCookieOptions(headers: Headers): CookieOptions {
  const localhost = isLocalhost(headers);

  // SameSite=Lax is sufficient: the OAuth callback is a top-level GET navigation
  // (Lax cookies are sent) and the SPA calls the API same-origin. Avoiding "None"
  // removes the cross-site CSRF surface on authenticated mutations.
  return {
    httpOnly: true,
    path: "/",
    sameSite: "Lax",
    secure: !localhost,
  };
}
