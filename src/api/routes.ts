import Router from "@koa/router";
import { Database } from "sqlite";
import { getOrders } from "@utils/database";
const router = new Router();

export default function createRouter(db?: Database, tokens?: string[]): Router {
  router.all("/", async (ctx, next) => {
    ctx.state.db = db;
    await next();
  });
  /**
   * Endpoint for checking where a trading post is online.
   */
  router.get("/ping", async (ctx, next) => {
    ctx.body = {
      uptime: process.uptime(),
    };
    await next();
  });

  router.get("/orders", async (ctx, next) => {
    ctx.body = await getOrders(db!, tokens!);
    await next();
  });

  return router;
}
