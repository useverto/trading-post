import "@utils/console";
import dotenv from "dotenv";
import commander from "commander";
import InitCommand from "@commands/init";
import UpgradeCommand from "@commands/upgrade";
import OrdersCommand from "@commands/orders";
import Log from "@utils/logger";
import { initAPI } from "@api/index";
import {
  init as initDB,
  setupTokenTables,
  shutdownHook,
} from "@utils/database";
import { loadConfig } from "@utils/config";
import Verto from "@verto/lib";
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
  .name("verto")
  .version("2.0.0")
  .command("run", { isDefault: true })
  /**
   * -k, --keyfile flag to specify the arweave keyfile location.
   */
  .option("-k, --key-file <file>", "Arweave wallet keyfile")
  /**
   * -c, --config flag to specify verto's configuration file
   */
  .option(
    "-c, --config <file>",
    "Verto trading post configuration",
    "verto.config.json"
  )
  .action(RunCommand);

/**
 * subcommand "init" to create a verto configuration file
 */
program
  .command("init")
  .description("generate a verto configuration file")
  .action(InitCommand);

program
  .command("orders")
  /**
   * -c, --config flag to specify verto's configuration file
   */
  .option(
    "-c, --config <file>",
    "Verto trading post configuration",
    "verto.config.json"
  )
  .description("Show trading post order book")
  .action(OrdersCommand);

/**
 * subcommand "upgrade" to upgrade to the latest trading post release
 */
program
  .command("upgrade")
  .description("upgrade to the latest trading post release")
  .action(UpgradeCommand);

/**
 * Parse the raw process arguments
 */
program.parse(process.argv);

/**
 * Starts the bootstrap process with the given keyfile and configuration
 */
async function RunCommand(opts: any) {
  /**
   * Load configuration from the provided config file
   */
  loadConfig(opts.config).then(async (cnf) => {
    /**
     * Create a database connection pool and pass to all workflows
     */
    let connPool = await initDB(cnf.database);
    /**
     * Setup database tables based on the contracts provided in the configuration
     */
    const client = new Verto();
    let tokens: string[] = (await client.getTokens()).map(
      (token: { id: string; name: string; ticker: string }) => token.id
    );
    cnf.genesis.blockedTokens.map((token) => {
      tokens.splice(tokens.indexOf(token), 1);
    });
    const tokenModels = setupTokenTables(connPool, tokens);
    /**
     * Instalise the trading post API
     */
    initAPI(
      cnf.genesis.publicURL,
      tokens,
      cnf.api.host,
      cnf.api.port,
      connPool
    );
    /**
     * Start the bootstrap workflow
     */
    bootstrap(cnf, connPool, opts.keyFile).catch((err) => log.error(err));
    /**
     * Setup shutdown hook
     */
    shutdownHook(connPool);
  });
}
