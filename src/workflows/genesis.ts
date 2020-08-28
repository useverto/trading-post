import Log from "@utils/logger";
import Arweave from "arweave";
import Community from "community-js";
import CONSTANTS from "../utils/constants.yml";

const log = new Log({
  level: Log.Levels.debug,
  name: "genesis",
});

export async function genesis(
  client: Arweave,
  addr: string,
  community: Community
) {
  const stake = await community.getVaultBalance(addr);
  if (stake <= 0) {
    throw new Error(
      "Stake value is <= 0." +
        "\n\t\tYou need to stake some tokens to be an eligible trading post." +
        `\n\t\tSee https://community.xyz/#${CONSTANTS.exchangeContractSrc}/vault` +
        "\n\t\tto stake your tokens"
    );
  }

  // TODO(@johnletey): Check for genesis tx, and send one if not already there.
}
