import Log from "@utils/logger";
import Arweave from "arweave";
import Community from "community-js";
import { getJwk } from "@utils/arweave";
import CONSTANTS from "../utils/constants.yml";
import { query } from "@utils/gql";
import genesisQuery from "../queries/genesis.gql";
import { GenesisConfig } from "@utils/config";

const log = new Log({
  level: Log.Levels.debug,
  name: "genesis",
});

export async function genesis(
  client: Arweave,
  community: Community,
  config: GenesisConfig,
  keyfile?: string
) {
  const jwk = await getJwk(keyfile);
  const walletAddr = await client.wallets.jwkToAddress(jwk!);

  const stake = await community.getVaultBalance(walletAddr);

  const possibleGenesis = (
    await query({
      query: genesisQuery,
      variables: {
        owners: [walletAddr],
        reciepents: [CONSTANTS.exchangeWallet],
      },
    })
  ).data.transactions.edges;
  if (possibleGenesis.length === 1) {
    log.info(
      `Found genesis transaction.\n\t\ttxId = ${possibleGenesis[0].node.id}`
    );
  } else {
    log.info("Sending genesis transaction");
    const tx = await client.createTransaction(
      {
        data: JSON.stringify(config),
        target: CONSTANTS.exchangeWallet,
      },
      jwk!
    );
    tx.addTag("Exchange", "Verto");
    tx.addTag("Trading-Post-Genesis", "Genesis");
    tx.addTag("Content-Type", "application/json");
    await client.transactions.sign(tx, jwk!);
    const res = await client.transactions.post(tx);
    log.info(`genesis_tx_id=${tx.id}`);
  }
}
