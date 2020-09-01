import { readFile } from "fs/promises";
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
  publicURL: URL;
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
    return config;
  } catch (e) {
    log.error(`Failed to deserialize trading post config: ${e}`);
    process.exit(1);
  }
}
