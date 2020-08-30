import Router from "@koa/router";

const router = new Router();

/**
 * Endpoint for requesting a trade
 * TODO(@john, @divy): implement trading
 */
router.get("/match", (ctx, next) => {
  ctx.body = "TODO";
  next();
});

export default router;
