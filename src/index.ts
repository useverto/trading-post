import "@utils/console";
import commander from "commander";
import Log from "@utils/logger";
import { init } from "@utils/arweave";
import { genesis } from "workflows/genesis";
import Koa from "koa";

const http = new Koa();

// logger

http.use(async (ctx, next) => {
  await next();
  const rt = ctx.response.get('X-Response-Time');
  log.debug(`${ctx.method} ${ctx.url} - ${rt}`);
});

// x-response-time

http.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.set('X-Response-Time', `${ms}ms`);
});


http.use(async ctx => {
  ctx.body = 'Hello World';
});

const log = new Log({
  level: Log.Levels.debug,
  name: "verto",
});

async function bootstrap(keyfile?: string, config?: string) {
  const { client, community } = await init(keyfile);

  await genesis(client, community, keyfile, config);

  // This logic grabs the latest trade tx
  // console.log(
  //   (
  //     await query({
  //       query: txsQuery,
  //       variables: {
  //         // @ts-ignore
  //         num: 1,
  //       },
  //     })
  //   ).data.transactions.edges[0]
  // );
}

const program = commander.program;
const verto = new commander.Command();

program.option("-k, --key-file <file>", "Arweave wallet keyfile");
program.option("-c, --config <file>", "Verto trading post config");

program.parse(process.argv);

if (program.keyFile && program.config) {
  bootstrap(program.keyFile, program.config).catch((err) => log.error(err));
}

app.listen(3000);