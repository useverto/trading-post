import Router from "@koa/router";
import { Database } from "sqlite";
import { getOrders } from "@utils/database";
import { getPairs } from "./gecko/pairs";
import { getTickers } from "./gecko/tickers";
import { getOrderBook } from "./gecko/orderbook";
import { getHistorical } from "./gecko/historical";
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
      uptime: process.uptime(),
    };
    await next();
  });

  router.get("/orders", async (ctx, next) => {
    ctx.body = await getOrders(db!);
    await next();
  });

  router.get("/pairs", async (ctx, next) => {
    ctx.body = await getPairs();
    await next();
  });

  router.get("/tickers", async (ctx, next) => {
    ctx.body = await getTickers();
    await next();
  });

  router.get("/orderbook", async (ctx, next) => {
    const id = ctx.query["ticker_id"];
    const depth = ctx.query["depth"] || 100;
    ctx.body = await getOrderBook(id, depth);
    await next();
  });

  router.get("/historical", async (ctx, next) => {
    const id = ctx.query["ticker_id"];
    const limit = ctx.query["limit"] || 10;
    ctx.body = await getHistorical(id, limit);
    await next();
  });

  return router;
}
