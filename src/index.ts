import "@utils/console";
import dotenv from "dotenv";
import commander from "commander";
import Log from "@utils/logger";
import { initAPI } from "@api/index";
import { init as initDB, setupTokenTables } from "@utils/database";
import { loadConfig } from "@utils/config";
import { bootstrap } from "@workflows/bootstrap";

dotenv.config();
const log = new Log({
  level: Log.Levels.debug,
  name: "verto",
});

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
