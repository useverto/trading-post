import Log from "@utils/logger";
import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { GenesisConfig } from "@utils/config";
import { readContract } from "smartweave";
import CONSTANTS from "../utils/constants.yml";
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

  log.info(`Sent genesis transaction.\n\t\ttxID = ${genesisTx.id}`);
}

interface Vault {
  balance: number;
  start: number;
  end: number;
}

export async function genesis(
  client: Arweave,
  jwk: JWKInterface,
  config: GenesisConfig
) {
  const walletAddr = await client.wallets.jwkToAddress(jwk);

  const vault = (await readContract(client, CONSTANTS.exchangeContractSrc))
    .vault;
  let stake = 0;
  if (walletAddr in vault) {
    const height = (await client.network.getInfo()).height;
    const filtered = vault[walletAddr].filter((a: Vault) => height < a.end);

    stake += filtered
      .map((a: Vault) => a.balance)
      .reduce((a: number, b: number) => a + b, 0);
  }

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
      `Found genesis transaction.\n\t\ttxID = ${possibleGenesis[0].node.id}`
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
      deepStrictEqual(currentConfig, config);
      return possibleGenesis[0].node.id;
    } catch {
      log.info(
        "Local config does not match latest genesis config.\n\t\tSending new genesis transaction ..."
      );

      return await sendGenesis(client, jwk, config);
    }
  } else {
    log.info("Sending genesis transaction ...");

    return await sendGenesis(client, jwk, config);
  }
}
