import Log from "@utils/logger";
import { Database } from "sqlite";
import { TradingPostConfig } from "@utils/config";
import { init, latestTxs } from "@utils/arweave";
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
  arLatest: {
    block: number;
    txID: string;
  }
): Promise<{
  txs: {
    id: string;
    block: number;
    sender: string;
    type: string;
    table?: string;
    order?: string;
    arAmnt?: number;
    amnt?: number;
    rate?: number;
  }[];
  arLatest: {
    block: number;
    txID: string;
  };
}> {
  const arRes = await latestTxs(db, addr, arLatest);

  return {
    txs: arRes.txs,
    arLatest: arRes.latest,
  };
}

export async function bootstrap(
  config: TradingPostConfig,
  db: Database,
  keyfile?: string,
  ethKeyfile?: string
) {
  const { client, addr, jwk } = await init(keyfile);

  await genesis(client, jwk!, config.genesis);

  log.info("Monitoring wallets for incoming transactions...");

  let arLatest: {
    block: number;
    txID: string;
  } = {
    block: (await client.network.getInfo()).height,
    txID: await client.wallets.getLastTransactionID(addr),
  };

  setInterval(async () => {
    const res = await getLatestTxs(db, addr, arLatest);
    const txs = res.txs;

    arLatest = res.arLatest;

    if (txs.length !== 0) {
      for (const tx of txs) {
        try {
          if (tx.type === "Cancel") {
            await cancel(client, tx.id, tx.order!, jwk!, db);
          } else if (tx.type === "Swap") {
          } else {
            if (tx.table! in config.genesis.blockedTokens) {
              log.error(
                `Token for order is blocked.\n\t\ttxID = ${tx.id}\n\t\ttype = ${
                  tx.type
                }\n\t\ttoken = ${tx.table!}`
              );
            } else {
              await match(client, tx, jwk!, db);
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
