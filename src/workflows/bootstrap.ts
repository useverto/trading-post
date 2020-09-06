import { TradingPostConfig } from "@utils/config";
import { Database } from "sqlite";
import { init } from "@utils/arweave";
import Log from "@utils/logger";
import { query } from "@utils/gql";
import tradesQuery from "../queries/trades.gql";
import { match } from "@workflows/match";
import { genesis } from "@workflows/genesis";
import { getTimestamp } from "@utils/database";
import Arweave from "arweave";

const log = new Log({
  level: Log.Levels.debug,
  name: "bootstrap",
});

async function getLatestTxs(
  client: Arweave,
  db: Database,
  addr: string,
  genesisTxId: string,
  latestBlockHeight?: number,
  latestTxId?: string
) {
  if (!latestBlockHeight) {
    latestBlockHeight = (await client.network.getInfo()).height;
  }

  const timeEntries = await getTimestamp(db);
  const time = timeEntries[timeEntries.length - 1]["createdAt"]
    .toString()
    .slice(0, -3);

  if (!latestTxId) {
    latestTxId = genesisTxId;
  }

  const _txs = (
    await query({
      query: `
        query ($recipients: [String!], $min: Int) {
          transactions(
            recipients: $recipients
            tags: [
              { name: "Exchange", values: "Verto" }
              { name: "Type", values: ["Buy", "Sell"] }
            ]
            block: {
              min: $min
            }
            first: 2147483647
          ) {
            edges {
              node {
                id
                block {
                  timestamp
                }
              }
            }
          }
        }    
      `,
      variables: {
        recipients: [addr],
        min: latestBlockHeight,
      },
    })
  ).data.transactions.edges.reverse();

  let index: number = 0;
  for (let i = 0; i < _txs.length; i++) {
    if (_txs[i] === latestTxId) {
      index = i;
      break;
    }
  }
  _txs.slice(index, _txs.length);

  const txs: string[] = [];

  for (const tx of _txs) {
    if (tx.node.block.timestamp > time) {
      txs.push(tx.node.id);
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
  // Monitor all new transactions that come into this wallet.
  log.info("Monitoring wallet for incoming transactions...");
  const timeEntries = await getTimestamp(db);
  const time = timeEntries[timeEntries.length - 1]["createdAt"]
    .toString()
    .slice(0, -3);
  let latestTxId: string;
  setInterval(async () => {
    // TODO(@johnletey): Less hacky way of doing this
    const candidateLatestTx = (
      await query({
        query: tradesQuery,
        variables: {
          recipients: [walletAddr],
          num: 50,
        },
      })
    ).data.transactions.edges.find((tx: any) => tx.node.block)?.node;

    if (candidateLatestTx && candidateLatestTx.block.timestamp > time) {
      if (candidateLatestTx.id !== latestTxId) {
        latestTxId = candidateLatestTx.id;

        try {
          await match(client, latestTxId, jwk!, db);
        } catch (err) {
          log.error(
            `Failed to handle transaction.\n\t\ttxId = ${latestTxId}\n\t\t${err}`
          );
        }
      }
    }
  }, 10000);
}
