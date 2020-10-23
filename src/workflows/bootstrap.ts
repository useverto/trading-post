import Log from "@utils/logger";
import { Database } from "sqlite";
import { getTimestamp } from "@utils/database";
import { query } from "@utils/gql";
import txsQuery from "../queries/txs.gql";
import CONSTANTS from "../utils/constants.yml";
import { TradingPostConfig } from "@utils/config";
import { init } from "@utils/arweave";
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
  genesisTxId: string,
  latestBlockHeight: number,
  latestTxId?: string
) {
  const timeEntries = await getTimestamp(db);
  const time = timeEntries[timeEntries.length - 1]["createdAt"]
    .toString()
    .slice(0, -3);

  if (!latestTxId) {
    latestTxId = genesisTxId;
  }

  let _txs = (
    await query({
      query: txsQuery,
      variables: {
        recipients: [addr],
        min: latestBlockHeight,
        num: CONSTANTS.maxInt,
      },
    })
  ).data.transactions.edges.reverse();

  let index: number = 0;
  for (let i = 0; i < _txs.length; i++) {
    if (_txs[i].node.id === latestTxId) {
      index = i + 1;
      break;
    }
  }
  _txs = _txs.slice(index, _txs.length);

  const txs: {
    id: string;
    height: number;
    chain: string;
    type: string;
    order: string;
  }[] = [];

  for (const tx of _txs) {
    if (tx.node.block.timestamp > time) {
      const type = tx.node.tags.find(
        (tag: { name: string; value: string }) => tag.name === "Type"
      )?.value;
      const chain = tx.node.tags.find(
        (tag: { name: string; value: string }) => tag.name === "Chain"
      )?.value;

      txs.push({
        id: tx.node.id,
        height: tx.node.block.height,
        chain,
        type,
        order:
          type === "Cancel"
            ? tx.node.tags.find(
                (tag: { name: string; value: string }) => tag.name === "Order"
              ).value
            : undefined,
      });
    }
  }

  return txs;
}

export async function bootstrap(
  config: TradingPostConfig,
  db: Database,
  keyfile?: string
) {
  const { client, walletAddr, jwk } = await init(keyfile);
  const { client: ethClient, sign } = await ethInit("privatekey");

  const genesisTxId = await genesis(client, jwk!, config.genesis);

  log.info("Monitoring wallet for incoming transactions...");

  let latestTxId: string;
  let latestBlockHeight = (await client.network.getInfo()).height;

  setInterval(async () => {
    const txs = await getLatestTxs(
      db,
      walletAddr,
      genesisTxId,
      latestBlockHeight,
      latestTxId
    );

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

      latestTxId = txs[txs.length - 1].id;
      latestBlockHeight = txs[txs.length - 1].height;
    }
  }, 10000);
}
