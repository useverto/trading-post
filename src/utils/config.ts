import { readFile } from "fs/promises";

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
  let config: TradingPostConfig = JSON.parse(
    await readFile(loc, { encoding: "utf8" })
  );
  return config;
}
