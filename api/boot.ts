import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { createOAuthCallbackHandler } from "./auth0/auth";
import { Paths } from "@contracts/constants";

type Bindings = {
  ASSETS: Fetcher;
  DATABASE_URL: string;
  AUTH0_DOMAIN: string;
  AUTH0_CLIENT_ID: string;
  AUTH0_CLIENT_SECRET: string;
  OWNER_UNION_ID: string;
  NODE_ENV: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Security headers on every response. Referrer-Policy: no-referrer keeps
// capability URLs (the ?p= list-password magic link, /invite/:token) from
// leaking via the Referer header to external image/purchase-link domains.
app.use("*", async (c, next) => {
  await next();
  c.header("Referrer-Policy", "no-referrer");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
});

app.use(bodyLimit({ maxSize: 1 * 1024 * 1024 }));
app.get(Paths.oauthCallback, createOAuthCallbackHandler());
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

app.get("*", async (c) => {
  if (c.env.ASSETS) {
    const res = await c.env.ASSETS.fetch(c.req.raw);
    if (res.status === 404) {
      // SPA fallback: serve index.html for all unmatched client-side routes
      const indexUrl = new URL("/index.html", c.req.url).toString();
      return c.env.ASSETS.fetch(new Request(indexUrl));
    }
    return res;
  }
  return c.notFound();
});

// Cloudflare Workers entry point — copies env bindings into process.env
export default {
  async fetch(request: Request, env: Bindings, ctx: ExecutionContext) {
    // Make Cloudflare env bindings available via process.env
    (globalThis as any).process ??= { env: {} };
    Object.assign((globalThis as any).process.env, env);
    return app.fetch(request, env, ctx);
  },
};
