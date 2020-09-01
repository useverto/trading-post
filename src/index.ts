import "@utils/console";
import dotenv from "dotenv";
import commander from "commander";
import Log from "@utils/logger";
import { init } from "@utils/arweave";
import { genesis } from "@workflows/genesis";
import { initAPI } from "@api/index";
import { init as initDB, setupTokenTables } from "@utils/database";
import { loadConfig, TradingPostConfig } from "@utils/config";
import { match } from "@workflows/match";
import { Database } from "sqlite";
import { query } from "@utils/gql";
import tradesQuery from "./queries/trades.gql";

dotenv.config();
const log = new Log({
  level: Log.Levels.debug,
  name: "verto",
});

async function bootstrap(
  config: TradingPostConfig,
  db: Database,
  keyfile?: string
) {
  const { client, walletAddr, community, jwk } = await init(keyfile);
  await genesis(client, community, jwk!, config.genesis);
  // Monitor all new transactions that come into this wallet.
  log.info("Monitoring wallet for incoming transactions...");
  let latestTxId: string;
  setInterval(async () => {
    const candidateLatestTx = (
      await query({
        query: tradesQuery,
        variables: {
          recipients: [walletAddr],
          num: 1,
        },
      })
    ).data.transactions.edges[0]?.node.id;

    if (candidateLatestTx !== latestTxId) {
      latestTxId = candidateLatestTx;

      try {
        await match(client, latestTxId, jwk!, db);
      } catch (err) {
        log.error(
          `Failed to handle transaction.\n\t\ttxId = ${latestTxId}\n\t\t${err}`
        );
      }
    }
  }, 10000);
}

const program = commander.program;

program.option("-k, --key-file <file>", "Arweave wallet keyfile");
program.option(
  "-c, --config <file>",
  "Verto trading post config",
  "verto.config.json"
);

program.parse(process.argv);

if (program.keyFile && program.config) {
  loadConfig(program.config).then((cnf) => {
    initDB(cnf.database).then((connPool) => {
      const tokenModels = setupTokenTables(
        connPool,
        cnf.genesis.acceptedTokens
      );
      bootstrap(cnf, connPool, program.keyFile).catch((err) => log.error(err));
      initAPI(cnf.api.host, cnf.api.port, connPool);
    });
  });
}
