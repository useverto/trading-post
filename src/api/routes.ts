import Router from "@koa/router";
import { Database } from "sqlite";
import { uptime } from "process";
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
      alive: uptime(),
    };
    await next();
  });

  return router;
}
