import { query } from "@utils/gql";
import tokensQuery from "../../queries/tokens.gql";
import { init } from "@utils/arweave";
import CONSTANTS from "../utils/constants.yml";

export async function getPairs() {
  // Query for all PSTs
  // AR_PST

  const currencies = await query({
    query: tokensQuery,
    variables: {
      exchange: CONSTANTS.exchangeWallet
    }
  });

  return {
    ticker_id: "BTC_ETH",
    base: "BTC",
    target: "ETH",
  };
}