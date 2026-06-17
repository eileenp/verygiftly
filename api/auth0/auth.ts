import type { Context } from "hono";
import { setCookie } from "hono/cookie";
import * as cookie from "cookie";
import { env } from "../lib/env";
import { getSessionCookieOptions } from "../lib/cookies";
import { Session } from "@contracts/constants";
import { Errors } from "@contracts/errors";
import { signSessionToken, verifySessionToken } from "./session";
import { timingSafeEqualString } from "../lib/password";
import { findUserByUnionId, upsertUser } from "../queries/users";
import type { TokenResponse, UserProfile } from "./types";

async function exchangeAuthCode(
  code: string,
  redirectUri: string,
): Promise<TokenResponse> {
  const resp = await fetch(`https://${env.auth0Domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: env.clientId,
      client_secret: env.clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token exchange failed (${resp.status}): ${text}`);
  }

  return resp.json() as Promise<TokenResponse>;
}

async function getUserProfile(accessToken: string): Promise<UserProfile> {
  const resp = await fetch(`https://${env.auth0Domain}/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Failed to fetch user profile (${resp.status}): ${text}`);
  }

  return resp.json() as Promise<UserProfile>;
}

export async function authenticateRequest(headers: Headers) {
  const cookies = cookie.parse(headers.get("cookie") || "");
  const token = cookies[Session.cookieName];
  if (!token) {
    console.warn("[auth] No session cookie found in request.");
    throw Errors.forbidden("Invalid authentication token.");
  }
  const claim = await verifySessionToken(token);
  if (!claim) {
    throw Errors.forbidden("Invalid authentication token.");
  }
  const user = await findUserByUnionId(claim.unionId);
  if (!user) {
    throw Errors.forbidden("User not found. Please re-login.");
  }
  return user;
}

export function createOAuthCallbackHandler() {
  return async (c: Context) => {
    const code = c.req.query("code");
    const state = c.req.query("state");
    const error = c.req.query("error");
    const errorDescription = c.req.query("error_description");

    if (error) {
      if (error === "access_denied") {
        return c.redirect("/", 302);
      }
      return c.json({ error, error_description: errorDescription }, 400);
    }

    if (!code || !state) {
      return c.json({ error: "code and state are required" }, 400);
    }

    // CSRF: `state` carries the redirect URI plus a nonce that must match the
    // nonce set in the oauth_state cookie before the redirect to Auth0.
    let redirectUri: string;
    let stateNonce: string;
    try {
      const parsed = JSON.parse(atob(state));
      redirectUri = parsed.r;
      stateNonce = parsed.n;
    } catch {
      return c.json({ error: "Invalid state" }, 400);
    }
    const cookies = cookie.parse(c.req.raw.headers.get("cookie") || "");
    const expectedNonce = cookies[Session.oauthStateCookie];
    if (
      !redirectUri ||
      !stateNonce ||
      !expectedNonce ||
      !timingSafeEqualString(stateNonce, expectedNonce)
    ) {
      return c.json({ error: "Invalid or missing state" }, 403);
    }
    // One-time use: clear the nonce cookie.
    setCookie(c, Session.oauthStateCookie, "", { path: "/", maxAge: 0 });

    try {
      const tokenResp = await exchangeAuthCode(code, redirectUri);
      const profile = await getUserProfile(tokenResp.access_token);

      await upsertUser({
        unionId: profile.sub,
        name: profile.name,
        avatar: profile.picture,
        email: profile.email,
        emailVerified: profile.email_verified ?? false,
        lastSignInAt: new Date(),
      });

      const token = await signSessionToken({
        unionId: profile.sub,
        clientId: env.clientId,
      });

      const cookieOpts = getSessionCookieOptions(c.req.raw.headers);
      setCookie(c, Session.cookieName, token, {
        ...cookieOpts,
        maxAge: Session.maxAgeMs / 1000,
      });

      return c.redirect("/dashboard", 302);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      return c.json({ error: "OAuth callback failed" }, 500);
    }
  };
}
