import Koa from "koa";
import Log from "@utils/logger";
import createRouter from "@api/routes";
import { v4 } from "uuid";
import { Database } from "sqlite";
import fetch from "node-fetch";
import cors from "@koa/cors";

const log = new Log({
  level: Log.Levels.debug,
  name: "api",
});

const http = new Koa();

http.use(cors());

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
  publicURL: string | URL,
  tokens: string[],
  host?: string,
  port?: number,
  db?: Database,
  startItself: boolean = true
) {
  port = port || 8080;
  host = host || "localhost";
  const verifyID = v4();
  http.use(createRouter(db, tokens).routes());
  if (startItself) http.listen(port, host);
  log.debug(`Started trading post server at port ${port}`);
  checkAvailability(publicURL);
  return http;
}

export function checkAvailability(url: string | URL) {
  let endpoint = String(url).endsWith("/") ? "ping" : "/ping";
  fetch(`${url}/${endpoint}`).catch((err) => {
    log.warn("API is not publically accessible");
  });
}
