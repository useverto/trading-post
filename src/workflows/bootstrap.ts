import Log from "@utils/logger";
import { Database } from "sqlite";
import { TradingPostConfig } from "@utils/config";
import { init, latestTxs } from "@utils/arweave";
import { init as ethInit, latestTxs as ethLatestTxs } from "@utils/eth";
import { genesis } from "@workflows/genesis";
import { cancel } from "@workflows/cancel";
import { ethSwap } from "@workflows/swap";
import { match } from "@workflows/match";
import Web3 from "web3";

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
  },
  ethClient: Web3,
  ethAddr: string,
  ethLatest: {
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
  ethLatest: {
    block: number;
    txID: string;
  };
}> {
  const arRes = await latestTxs(db, addr, arLatest);
  const ethRes = await ethLatestTxs(ethClient, ethAddr, ethLatest);

  return {
    txs: arRes.txs.concat(ethRes.txs),
    arLatest: arRes.latest,
    ethLatest: ethRes.latest,
  };
}

export async function bootstrap(
  config: TradingPostConfig,
  db: Database,
  keyfile?: string,
  ethKeyfile?: string
) {
  const { client, addr, jwk } = await init(keyfile);
  const { client: ethClient, addr: ethAddr, sign } = await ethInit(ethKeyfile);

  await genesis(client, jwk!, config.genesis);

  log.info("Monitoring wallets for incoming transactions...");

  let arLatest: {
    block: number;
    txID: string;
  } = {
    block: (await client.network.getInfo()).height,
    txID: await client.wallets.getLastTransactionID(addr),
  };

  const latestEthBlock = await ethClient.eth.getBlock("latest");
  let ethLatest: {
    block: number;
    txID: string;
  } = {
    block: latestEthBlock.number,
    txID: latestEthBlock.transactions[0],
  };

  setInterval(async () => {
    const res = await getLatestTxs(
      db,
      addr,
      arLatest,
      ethClient,
      ethAddr,
      ethLatest
    );
    const txs = res.txs;

    arLatest = res.arLatest;
    ethLatest = res.ethLatest;

    if (txs.length !== 0) {
      for (const tx of txs) {
        try {
          if (tx.type === "Cancel") {
            await cancel(client, tx.id, tx.order!, jwk!, db);
          } else if (tx.type === "Swap") {
            if (tx.table === "ETH") {
              if ("ETH" in config.genesis.chain) {
                await ethSwap(
                  client,
                  ethClient,
                  {
                    id: tx.id,
                    sender: tx.sender,
                    table: tx.table,
                    arAmnt: tx.arAmnt,
                    amnt: tx.amnt,
                    rate: tx.rate,
                  },
                  jwk!,
                  sign,
                  db
                );
              } else {
                log.error(
                  `Received an ETH swap.\n\t\tConsider adding support for this.`
                );
              }
            }
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
