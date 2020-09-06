import Log from "@utils/logger";
import Arweave from "arweave";
import Community from "community-js";
import { JWKInterface } from "arweave/node/lib/wallet";
import { GenesisConfig } from "@utils/config";
import CONSTANTS from "../utils/constants.yml";
import { query } from "@utils/gql";
import genesisQuery from "../queries/genesis.gql";

const log = new Log({
  level: Log.Levels.debug,
  name: "genesis",
});

// function isEqual(a: any, b: any) {
//   if (a === b) return true;
//   if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
//   if (!a || !b || (typeof a !== 'object' && typeof b !== 'object')) return a === b;
//   if (a === null || a === undefined || b === null || b === undefined) return false;
//   if (a.prototype !== b.prototype) return false;
//   let keys = Object.keys(a);
//   if (keys.length !== Object.keys(b).length) return false;
//   return keys.every(k => isEqual(a[k], b[k]));
// };

export async function genesis(
  client: Arweave,
  community: Community,
  jwk: JWKInterface,
  config: GenesisConfig
) {
  const walletAddr = await client.wallets.jwkToAddress(jwk);

  const stake = await community.getVaultBalance(walletAddr);
  if (stake <= 0) {
    log.error(
      "Stake value is <= 0." +
        "\n\t\tYou need to stake some tokens to be an eligible trading post." +
        `\n\t\tSee https://community.xyz/#${CONSTANTS.exchangeContractSrc}/vault` +
        "\n\t\tto stake your tokens."
    );
    process.exit(1);
  }

  const possibleGenesis = (
    await query({
      query: genesisQuery,
      variables: {
        owners: [walletAddr],
        recipients: [CONSTANTS.exchangeWallet],
      },
    })
  ).data.transactions.edges;

  if (possibleGenesis.length === 1) {
    log.info(
      `Found genesis transaction.\n\t\ttxId = ${possibleGenesis[0].node.id}`
    );

    // const currentConfig = JSON.parse(
    //   (
    //     await client.transactions.getData(possibleGenesis[0].node.id, {
    //       decode: true,
    //       string: true,
    //     })
    //   ).toString()
    // );

    return possibleGenesis[0].node.id;
  } else {
    log.info("Sending genesis transaction ...");

    const genesisTx = await client.createTransaction(
      {
        data: JSON.stringify(config),
        target: CONSTANTS.exchangeWallet,
      },
      jwk
    );

    genesisTx.addTag("Exchange", "Verto");
    genesisTx.addTag("Type", "Genesis");
    genesisTx.addTag("Content-Type", "application/json");

    await client.transactions.sign(genesisTx, jwk);
    await client.transactions.post(genesisTx);

    log.info(`Sent genesis transaction.\n\t\ttxId = ${genesisTx.id}`);

    return genesisTx.id;
  }
}
