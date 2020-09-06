import Koa from "koa";
import Log from "@utils/logger";
import createRouter from "@api/routes";
import { v4 } from "uuid";
import { Database } from "sqlite";
import fetch from "node-fetch";
import cors from "@koa/cors";
import { TradingPostConfig } from "@utils/config";
import CONSTANTS from "../utils/constants.yml";
import { nextTick } from "process";

const log = new Log({
  level: Log.Levels.debug,
  name: "api",
});

const http = new Koa();

// attach logger
http.use(async (ctx, next) => {
  await next();
  const rt = ctx.response.get("X-Response-Time");
  log.debug(`${ctx.method} ${ctx.url} - ${rt}`);
});

// set response time header - `x-response-time`
http.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.set("X-Response-Time", `${ms}ms`);
});

/**
 * Start the trading post HTTP server
 */
export function initAPI(
  config: TradingPostConfig,
  db?: Database,
  listen: boolean = true
) {
  const port = config.api.port || 8080;
  const host = config.api.host || "localhost";
  const verifyID = v4();
  http.use(createRouter(db, config.genesis.acceptedTokens).routes());
  if (config.api.allowedOrigins) {
    /** Always allow verto's frontend and localhost to send in requests */
    config.api.allowedOrigins.push(CONSTANTS.vertoDomain);
    http.use(checkOriginAgainstWhitelist(config.api.allowedOrigins));
  }
  if (listen) http.listen(port, host);
  log.debug(`Started trading post server at port ${port}`);
  checkAvailability(config.genesis.publicURL);
  return http;
}

export function checkAvailability(url: string | URL) {
  let endpoint = String(url).endsWith("/") ? "ping" : "/ping";
  fetch(`${url}/${endpoint}`).catch((err) => {
    log.warn("API is not publically accessible");
  });
}

function checkOriginAgainstWhitelist(whitelist: string[]) {
  return async (ctx: Koa.Context, next: Koa.Next) => {
    const requestOrigin = new URL(ctx.request.origin).hostname;
    whitelist = whitelist.map((i) => new URL(i).hostname);
    if (
      !whitelist.includes(requestOrigin) ||
      !whitelist.includes("localhost")
    ) {
      ctx.body = `${requestOrigin} is not a valid origin`;
      return;
    }
    await next();
  };
}
