import { authRouter } from "./auth-router";
import { listRouter } from "./list-router";
import { itemRouter } from "./item-router";
import { viewerRouter } from "./viewer-router";
import { settingsRouter } from "./settings-router";
import { scrapeRouter } from "./scrape-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  list: listRouter,
  item: itemRouter,
  viewer: viewerRouter,
  settings: settingsRouter,
  scrape: scrapeRouter,
});

export type AppRouter = typeof appRouter;
