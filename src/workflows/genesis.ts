import Log from "@utils/logger";
import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { GenesisConfig } from "@utils/config";
import CONSTANTS from "../utils/constants.yml";
import Community from "community-js";
import { query } from "@utils/gql";
import genesisQuery from "../queries/genesis.gql";
import { deepStrictEqual } from "assert";

const log = new Log({
  level: Log.Levels.debug,
  name: "genesis",
});

async function sendGenesis(
  client: Arweave,
  jwk: JWKInterface,
  config: GenesisConfig
) {
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
}

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

    const currentConfig = JSON.parse(
      (
        await client.transactions.getData(possibleGenesis[0].node.id, {
          decode: true,
          string: true,
        })
      ).toString()
    );

    try {
      deepStrictEqual(currentConfig, config, "");
    } catch (err) {
      log.info(
        "Local config does not match latest genesis config.\n\t\tSending new genesis transaction ..."
      );

      await sendGenesis(client, jwk, config);
    }
  } else {
    log.info("Sending genesis transaction ...");

    await sendGenesis(client, jwk, config);
  }
}
