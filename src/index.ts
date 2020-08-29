import "@utils/console";
import commander from "commander";
import Log from "@utils/logger";
import { init, monitorWallet } from "@utils/arweave";
import { genesis } from "workflows/genesis";
import { initAPI } from "@utils/api";

const log = new Log({
  level: Log.Levels.debug,
  name: "verto",
});

async function bootstrap(keyfile?: string, config?: string) {
  const { client, walletAddr, community } = await init(keyfile);

  await genesis(client, community, keyfile, config);

  // Monitor all new transactions that come into this wallet.
  log.info("Monitoring wallet for incoming transactions...");
  for await (const txId of monitorWallet(client, walletAddr)) {
    try {
      log.info(`Attempting to match transaction. txId=${txId}`);
    } catch (err) {
      // await log.error(`Failed to handle tx, tx_id=${txId}`, err);
    }
  }
}

const program = commander.program;
const verto = new commander.Command();

program.option("-k, --key-file <file>", "Arweave wallet keyfile");
program.option("-c, --config <file>", "Verto trading post config");
program.option("-p, --port <port>", "Trading post API server port", "8080");

program.parse(process.argv);

if (program.keyFile && program.config) {
  bootstrap(program.keyFile, program.config).catch((err) => log.error(err));
  initAPI(parseInt(program.port));
}
