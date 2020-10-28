import Log from "@utils/logger";
import { Database } from "sqlite";
import { query } from "@utils/gql";
import { TradingPostConfig } from "@utils/config";
import { init, latestTxs } from "@utils/arweave";
import { init as ethInit } from "@utils/eth";
import { genesis } from "@workflows/genesis";
import { cancel } from "@workflows/cancel";
import { ethSwap } from "@workflows/swap";
import txQuery from "../queries/tx.gql";
import { match } from "@workflows/match";

const log = new Log({
  level: Log.Levels.debug,
  name: "bootstrap",
});

async function getLatestTxs(
  db: Database,
  addr: string,
  arLatest: {
    block: number;
    txID: string;
  }
) {
  return await latestTxs(db, addr, arLatest);
}

export async function bootstrap(
  config: TradingPostConfig,
  db: Database,
  keyfile?: string,
  ethKeyfile?: string
) {
  const { client, walletAddr, jwk } = await init(keyfile);
  const { client: ethClient, sign } = await ethInit(ethKeyfile);

  const genesisTxId = await genesis(client, jwk!, config.genesis);

  log.info("Monitoring wallets for incoming transactions...");

  let arLatest: {
    block: number;
    txID: string;
  } = {
    block: (await client.network.getInfo()).height,
    txID: genesisTxId,
  };

  setInterval(async () => {
    const res = await getLatestTxs(db, walletAddr, arLatest);
    const txs = res.txs;
    arLatest = res.latest;

    if (txs.length !== 0) {
      for (const tx of txs) {
        try {
          if (tx.type === "Cancel") {
            await cancel(client, tx.id, tx.order, jwk!, db);
          } else if (tx.type === "Swap") {
            if (tx.chain === "ETH") {
              if ("ETH" in config.genesis.chain) {
                await ethSwap(client, ethClient, tx.id, jwk!, sign, db);
              } else {
                log.error(
                  `Received an ETH swap.\n\t\tConsider adding support for this.`
                );
              }
            }
          } else {
            const order = (
              await query({
                query: txQuery,
                variables: {
                  txID: tx.id,
                },
              })
            ).data.transaction;

            const tokenTag = tx.type === "Buy" ? "Token" : "Contract";
            const token = order.tags.find(
              (tag: { name: string; value: string }) => tag.name === tokenTag
            ).value;

            if (token in config.genesis.blockedTokens) {
              log.error(
                `Token for order is blocked.\n\t\ttxID = ${tx.id}\n\t\ttype = ${tx.type}\n\t\ttoken = ${token}`
              );
            } else {
              await match(client, tx.id, jwk!, db);
            }
          }
        } catch (err) {
          log.error(
            `Failed to handle transaction.\n\t\ttxID = ${tx.id}\n\t\t${err}`
          );
        }
      }
    }
  }, 10000);
}
