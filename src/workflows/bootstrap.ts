import Log from "@utils/logger";
import { Database } from "sqlite";
import { TradingPostConfig } from "@utils/config";
import { getChainAddr, init, latestTxs } from "@utils/arweave";
import { init as ethInit } from "@utils/eth";
import { genesis } from "@workflows/genesis";
import { cancel } from "@workflows/cancel";
import { ethSwap } from "@workflows/swap";
import { match } from "@workflows/match";
import Web3 from "web3";
import { getTxStore } from "@utils/database";
import Arweave from "arweave";

const log = new Log({
  level: Log.Levels.debug,
  name: "bootstrap",
});

async function getLatestTxs(
  client: Arweave,
  db: Database,
  addr: string,
  latest: {
    block: number;
    txID: string;
  },
  ethClient: Web3,
  ethAddr: string,
  counter: number
): Promise<{
  txs: {
    id: string;
    block: number;
    sender: { ar: string; eth?: string };
    type: string;
    table?: string;
    token?: string;
    order?: string;
    arAmnt?: number;
    amnt?: number;
    rate?: number;
  }[];
  latest: {
    block: number;
    txID: string;
  };
}> {
  const arRes = await latestTxs(client, db, addr, latest);

  const ethRes: {
    id: string;
    block: number;
    sender: { ar: string; eth?: string };
    type: string;
    table?: string;
    token?: string;
    order?: string;
    arAmnt?: number;
    amnt?: number;
    rate?: number;
  }[] = [];
  if (counter == 60) {
    const store = await getTxStore(db);
    for (const entry of store) {
      try {
        const tx = await ethClient.eth.getTransaction(entry.txHash);

        if (tx.to !== ethAddr) {
          // tx is invalid
          await db.run(`UPDATE "TX_STORE" SET parsed = 1 WHERE txHash = ?`, [
            entry.txHash,
          ]);
        }

        if (tx.blockNumber) {
          ethRes.push({
            id: entry.txHash,
            block: tx.blockNumber,
            sender: { ar: entry.sender, eth: tx.from },
            type: "Swap",
            table: entry.chain,
            token: entry.token,
            amnt: parseFloat(ethClient.utils.fromWei(tx.value, "ether")),
          });
          await db.run(`UPDATE "TX_STORE" SET parsed = 1 WHERE txHash = ?`, [
            entry.txHash,
          ]);
        }
      } catch (err) {
        await db.run(`UPDATE "TX_STORE" SET parsed = 1 WHERE txHash = ?`, [
          entry.txHash,
        ]);
      }
    }
  }

  return {
    txs: arRes.txs.concat(ethRes),
    latest: arRes.latest,
  };
}

export async function bootstrap(
  config: TradingPostConfig,
  db: Database,
  keyfile?: string,
  ethKeyfile?: string
) {
  const { client, addr, jwk } = await init(keyfile);
  const {
    client: ethClient,
    addr: ethAddr,
    sign,
  } = await ethInit(ethKeyfile, config.genesis.chain["ETH"].node);

  await genesis(client, jwk!, config.genesis);

  log.info("Monitoring wallets for incoming transactions...");

  let latest: {
    block: number;
    txID: string;
  } = {
    block: (await client.network.getInfo()).height,
    txID: await client.wallets.getLastTransactionID(addr),
  };

  let counter = 60;

  setInterval(async () => {
    const res = await getLatestTxs(
      client,
      db,
      addr,
      latest,
      ethClient,
      ethAddr,
      counter
    );
    const txs = res.txs;

    latest = res.latest;
    if (counter == 60) {
      counter = 0;
    } else {
      counter++;
    }

    if (txs.length !== 0) {
      for (const tx of txs) {
        try {
          if (tx.type === "Cancel") {
            await cancel(client, tx.id, tx.order!, jwk!, db);
          } else if (tx.type === "Swap") {
            if (tx.table === "ETH") {
              if ("ETH" in config.genesis.chain) {
                await ethSwap(
                  {
                    id: tx.id,
                    sender: tx.sender,
                    table: tx.table,
                    token: tx.token,
                    arAmnt: tx.arAmnt,
                    amnt: tx.amnt,
                    rate: tx.rate,
                    received: 0,
                  },
                  db,
                  client,
                  jwk!,
                  ethClient,
                  sign
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
              await match(client, { ...tx, sender: tx.sender.ar }, jwk!, db);
            }
          }
        } catch (err) {
          log.error(
            `Failed to handle transaction.\n\t\ttxID = ${tx.id}\n\t\t${err}`
          );
          process.exit(1);
        }
      }
    }
  }, 10000);
}
