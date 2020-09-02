import Router from "@koa/router";
import { Database } from "sqlite";
const router = new Router();

export default function createRouter(db?: Database): Router {
  router.all("/", async (ctx, next) => {
    ctx.state.db = db;
    await next();
  });
  /**
   * Endpoint for checking where a trading post is online.
   */
  router.get("/ping", async (ctx, next) => {
    ctx.body = {
      up: true,
      alive: process.uptime(),
    };
    await next();
  });

  return router;
}
