import Log from "@utils/logger";
import { Database } from "sqlite";
import { getTimestamp } from "@utils/database";
import { query } from "@utils/gql";
import txsQuery from "../queries/txs.gql";
import CONSTANTS from "../utils/constants.yml";
import { TradingPostConfig } from "@utils/config";
import { init } from "@utils/arweave";
import { genesis } from "@workflows/genesis";
import { cancel } from "@workflows/cancel";
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

  const txs: { id: string; height: number; type: string; order: string }[] = [];

  for (const tx of _txs) {
    if (tx.node.block.timestamp > time) {
      const type = tx.node.tags.find(
        (tag: { name: string; value: string }) => tag.name === "Type"
      ).value;

      txs.push({
        id: tx.node.id,
        height: tx.node.block.height,
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
  const { client, walletAddr, community, jwk } = await init(keyfile);

  const genesisTxId = await genesis(client, community, jwk!, config.genesis);

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
          } else {
            await match(client, tx.id, jwk!, db);
          }
        } catch (err) {
          log.error(
            `Failed to handle transaction.\n\t\ttxId = ${tx.id}\n\t\t${err}`
          );
        }
      }

      latestTxId = txs[txs.length - 1].id;
      latestBlockHeight = txs[txs.length - 1].height;
    }
  }, 10000);
}
