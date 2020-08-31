import "@utils/console";
import dotenv from "dotenv";
import commander from "commander";
import Log from "@utils/logger";
import { init, monitorWallet } from "@utils/arweave";
import { genesis } from "@workflows/genesis";
import { initAPI } from "@api/index";
import { init as initDB, setupTokenTables, TokenModel } from "@utils/database";
import { loadConfig, TradingPostConfig } from "@utils/config";
import { match } from "@workflows/match";

dotenv.config();
const log = new Log({
  level: Log.Levels.debug,
  name: "verto",
});

async function bootstrap(
  config: TradingPostConfig,
  models: TokenModel[],
  keyfile?: string
) {
  const { client, walletAddr, community } = await init(keyfile);

  await genesis(client, community, config.genesis, keyfile);

  // Monitor all new transactions that come into this wallet.
  log.info("Monitoring wallet for incoming transactions...");
  for await (const txId of monitorWallet(client, walletAddr)) {
    try {
      await match(client, txId, models);
    } catch (err) {
      log.error(`Failed to handle transaction.\n\t\ttxId = ${txId}\n\t\t${err}`);
    }
  }
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
      bootstrap(cnf, tokenModels, program.keyFile).catch((err) =>
        log.error(err)
      );
      initAPI(cnf.api.host, cnf.api.port, tokenModels);
    });
  });
}
