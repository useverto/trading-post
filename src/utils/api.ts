import Koa from "koa";
import Log from "@utils/logger";

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

http.use(async (ctx) => {
  ctx.body = "Hello, I am a Verto trading post ;)";
});

/**
 * Start the trading post HTTP server
 */
export function initAPI(port?: number) {
  return http.listen(port || 8080);
}
