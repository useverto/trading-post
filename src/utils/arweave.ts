import Arweave from "arweave";
import { JWKPublicInterface } from "arweave/node/lib/wallet";
import Logger from "@utils/logger";
import { relative } from "path";
import * as fs from "fs";
import { Database } from "sqlite";
import { getTimestamp } from "@utils/database";
import { query } from "@utils/gql";
import txsQuery from "../queries/txs.gql";
import CONSTANTS from "../utils/constants.yml";

const { readFile } = fs.promises;

const relativeKeyPath = process.env.KEY_PATH
  ? relative(__dirname, process.env.KEY_PATH)
  : "./arweave.json";

const log = new Logger({
  level: Logger.Levels.debug,
  name: "arweave",
});

export async function init(keyfile?: string) {
  const client = new Arweave({
    host: "arweave.dev",
    port: 443,
    protocol: "https",
    timeout: 20000,
    logging: false,
    logger: (msg: any) => {
      if (new Error().stack?.includes("smartweave")) return;
      log.debug(msg);
    },
  });

  const jwk = await getJwk(keyfile);
  const walletAddr = await client.wallets.jwkToAddress(jwk!);
  const balance = client.ar.winstonToAr(
    await client.wallets.getBalance(walletAddr)
  );

  log.info(
    "Created Arweave instance:\n\t\t" +
      `addr    = ${walletAddr}\n\t\t` +
      `balance = ${parseFloat(balance).toFixed(3)} AR`
  );

  return { client, walletAddr, jwk };
}

let cachedJwk: JWKPublicInterface | undefined;
export async function getJwk(keyfile?: string) {
  if (!cachedJwk) {
    log.info(`Loading keyfile from: ${keyfile || relativeKeyPath}`);
    const potentialJwk = JSON.parse(
      await readFile(keyfile || relativeKeyPath, { encoding: "utf8" })
    );
    cachedJwk = potentialJwk;
  }
  return cachedJwk;
}

export const latestTxs = async (
  db: Database,
  addr: string,
  latest: {
    block: number;
    txID: string;
  }
): Promise<{
  txs: {
    id: string;
    block: number;
    chain: string;
    type: string;
    order: string;
  }[];
  latest: {
    block: number;
    txID: string;
  };
}> => {
  const timeEntries = await getTimestamp(db);
  const time = timeEntries[timeEntries.length - 1]["createdAt"]
    .toString()
    .slice(0, -3);

  let _txs = (
    await query({
      query: txsQuery,
      variables: {
        recipients: [addr],
        min: latest.block,
        num: CONSTANTS.maxInt,
      },
    })
  ).data.transactions.edges.reverse();

  console.log(_txs);

  let index: number = 0;
  for (let i = 0; i < _txs.length; i++) {
    if (_txs[i].node.id === latest.txID) {
      index = i + 1;
      break;
    }
  }
  _txs = _txs.slice(index, _txs.length);

  console.log(_txs);

  const txs: {
    id: string;
    block: number;
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
        block: tx.node.block.height,
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

  let newLatest = latest;
  if (txs.length > 0) {
    newLatest = {
      block: txs[txs.length - 1].block,
      txID: txs[txs.length - 1].id,
    };
  }

  return { txs, latest: newLatest };
};
