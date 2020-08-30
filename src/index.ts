import "@utils/console";
import commander from "commander";
import Log from "@utils/logger";
import { init, monitorWallet } from "@utils/arweave";
import { genesis } from "@workflows/genesis";
import { initAPI } from "@api/index";
import { loadConfig, TradingPostConfig } from "@utils/config";

const log = new Log({
  level: Log.Levels.debug,
  name: "verto",
});

async function bootstrap(config: TradingPostConfig, keyfile?: string) {
  const { client, walletAddr, community } = await init(keyfile);

  await genesis(client, community, config.genesis, keyfile);

  // Monitor all new transactions that come into this wallet.
  log.info("Monitoring wallet for incoming transactions...");
  for await (const txId of monitorWallet(client, walletAddr)) {
    try {
      log.info(`Attempting to match transaction. txId=${txId}`);
    } catch (err) {
      // log.error(`Failed to handle tx, tx_id=${txId}`, err);
    }
  }
}

const program = commander.program;
const verto = new commander.Command();

program.option("-k, --key-file <file>", "Arweave wallet keyfile");
program.option(
  "-c, --config <file>",
  "Verto trading post config",
  "verto.config.json"
);
program.option("-p, --port <port>", "Trading post API server port", "8080");

program.parse(process.argv);

if (program.keyFile && program.config) {
  loadConfig(program.config).then((cnf) => {
    bootstrap(cnf, program.keyFile).catch((err) => log.error(err));
    initAPI(parseInt(program.port));
  });
}
