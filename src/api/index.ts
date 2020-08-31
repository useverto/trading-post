import Koa from "koa";
import Log from "@utils/logger";
import PingRouter from "@endpoints/ping";
import MatchRouter from "@endpoints/match";
import { TokenModel } from "@utils/database";

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

http.use(PingRouter.routes()).use(MatchRouter.routes());

/**
 * Start the trading post HTTP server
 */
export function initAPI(host?: string, port?: number, models?: TokenModel[]) {
  port = port || 8080;
  host = host || "localhost";
  if (models?.length && models?.length > 0) {
    setupDbMiddleware(models);
  }
  http.listen(port, host);
  log.debug(`Started trading post server at port ${port}`);
}

function setupDbMiddleware(models: TokenModel[]) {
  return http.use(async (ctx, next) => {
    ctx.models = models;
    next();
  });
}
