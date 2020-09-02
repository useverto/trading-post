import { readFile, writeFile } from "fs/promises";
import { URL } from "url";
import Logger from "@utils/logger";

const log = new Logger({
  name: "config",
  level: Logger.Levels.debug,
});

/**
 * Trading post API Server configuration
 */
export interface APIConfig {
  host: string;
  port: number;
}

/**
 * Trading post Genesis info
 */
export interface GenesisConfig {
  acceptedTokens: string[];
  tradeFee: string;
  version: string;
  publicURL: URL | string;
}

/**
 * The Trading post configuration
 */
export interface TradingPostConfig {
  genesis: GenesisConfig;
  database: string;
  api: APIConfig;
}

/**
 * Read the trading post config
 * @param loc Location of the config file
 */
export async function loadConfig(loc: string): Promise<TradingPostConfig> {
  try {
    let config: TradingPostConfig = JSON.parse(
      await readFile(loc, { encoding: "utf8" })
    );
    log.info(`Loaded config file from ${loc}`);
    return config;
  } catch (e) {
    log.error(`Failed to deserialize trading post config: ${e}`);
    process.exit(1);
  }
}

/**
 * Write the trading post configuration to a json file
 * @param loc Location of the desired config file
 * @param config The trading post configuration
 */
export async function createConfig(loc: string, config: TradingPostConfig) {
  try {
    await writeFile(loc, JSON.stringify(config, null, 2), { encoding: "utf8" });
    log.info(`Created Verto configuration file at ${loc}`);
  } catch (e) {
    log.error(`Failed to write trading post config: ${e}`);
    process.exit(1);
  }
}
