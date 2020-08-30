import Router from "@koa/router";

const router = new Router();

/**
 * Endpoint for checking where a trading post is online.
 */
router.get("/ping", (ctx, next) => {
  ctx.body = "Hello, I am a Verto trading post ;)";
  next();
});

export default router;
