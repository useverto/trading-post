import { TradingPostConfig } from "@utils/config";
import { Database } from "sqlite";
import { init } from "@utils/arweave";
import Log from "@utils/logger";
import { query } from "@utils/gql";
import tradesQuery from "../queries/trades.gql";
import { match } from "@workflows/match";
import { genesis } from "@workflows/genesis";
import { getTimestamp } from "@utils/database";

const log = new Log({
  level: Log.Levels.debug,
  name: "bootstrap",
});

export async function bootstrap(
  config: TradingPostConfig,
  db: Database,
  keyfile?: string
) {
  const { client, walletAddr, community, jwk } = await init(keyfile);
  await genesis(client, community, jwk!, config.genesis);
  // Monitor all new transactions that come into this wallet.
  log.info("Monitoring wallet for incoming transactions...");
  const timeEntries = (await getTimestamp(db))!;
  const time = timeEntries[timeEntries.length - 1]["createdAt"];
  let latestTxId: string;
  setInterval(async () => {
    const candidateLatestTx = (
      await query({
        query: tradesQuery,
        variables: {
          recipients: [walletAddr],
          num: 1,
        },
      })
    ).data.transactions.edges[0]?.node;

    if (candidateLatestTx.block && candidateLatestTx.block.timestamp > time) {
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
