import { prompt } from "enquirer";
import { createConfig, TradingPostConfig } from "@utils/config";

/**
 * Prompts user for input on fields for the configuration and writes to disk
 */
export default async () => {
  /**
   * Prompts for input and collects response
   */
  const response = await prompt([
    {
      type: "list",
      name: "genesis.acceptedTokens",
      message: "Enter the contract ID for the supported token(s)",
    },
    {
      type: "text",
      name: "genesis.tradeFee",
      message: "What will be the trade fee for the trading post?",
    },
    {
      type: "input",
      name: "database",
      message: "Enter the database location",
    },
    {
      type: "input",
      name: "api.host",
      message: "Enter trading post API host",
    },
    {
      type: "input",
      name: "api.port",
      message: "Enter trading post API port",
    },
    {
      type: "input",
      name: "genesis.publicURL",
      message: "Enter the publicly accessible url for the trading post",
    },
  ]);
  /**
   * Writes the configuration file to disk
   */
  await createConfig("verto.config.json", response as TradingPostConfig);
};
