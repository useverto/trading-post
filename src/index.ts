import "@utils/console";
import dotenv from "dotenv";
import commander from "commander";
import InitCommand from "@commands/init";
import Log from "@utils/logger";
import { initAPI } from "@api/index";
import {
  init as initDB,
  setupTokenTables,
  shutdownHook,
} from "@utils/database";
import { loadConfig } from "@utils/config";
import { bootstrap } from "@workflows/bootstrap";

/**
 * Initialize enviornment variables from .env
 */
dotenv.config();

/**
 * Create a logger instance
 */
const log = new Log({
  level: Log.Levels.debug,
  name: "verto",
});

/**
 * Create a CLI program and define argument flags
 */
const program = commander.program;
program
  .version("2.0.0")
  /**
   * -k, --keyfile flag to specify the arweave keyfile location.
   */
  .option("-k, --key-file <file>", "Arweave wallet keyfile")
  /**
   * -c, --config flag to specify verto's configuration file
   */
  .option(
    "-c, --config <file>",
    "Verto trading post config",
    "verto.config.json"
  );
/**
 * subcommand "init" to create a verto configuration file
 */
// .command("init")
// .description("generate a verto configuration file")
// .action(InitCommand);

/**
 * Parse the raw process arguments
 */
program.parse(process.argv);

/**
 * Starts the bootstrap process with the given keyfile and configuration
 */
if (program.keyFile && program.config) {
  /**
   * Load configuration from the provided config file
   */
  loadConfig(program.config).then(async (cnf) => {
    /**
     * Create a database connection pool and pass to all workflows
     */
    let connPool = await initDB(cnf.database);
    /**
     * Setup database tables based on the contracts provided in the configuration
     */
    const tokenModels = setupTokenTables(connPool, cnf.genesis.acceptedTokens);
    /**
     * Start the bootstrap workflow
     */
    bootstrap(cnf, connPool, program.keyFile).catch((err) => log.error(err));
    /**
     * Instalise the trading post API
     */
    initAPI(cnf.api.host, cnf.api.port, connPool);
    /**
     * Setup shutdown hook
     */
    shutdownHook(connPool);
  });
}
