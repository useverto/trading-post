import * as fs from "fs";
import { relative } from "path";
import Logger from "@utils/logger";
import Web3 from "web3";

const { readFile } = fs.promises;

const relativeKeyPath = process.env.KEY_PATH
  ? relative(__dirname, process.env.KEY_PATH)
  : "./privatekey";

const log = new Logger({
  level: Logger.Levels.debug,
  name: "eth",
});

export async function init(keyfile?: string) {
  log.info(`Loading private key from: ${keyfile || relativeKeyPath}`);
  const privateKey = (await readFile(keyfile || relativeKeyPath)).toString();

  const client = new Web3(
    new Web3.providers.HttpProvider(
      "https://:8bebd45d5f054e939b419779c2c95074@mainnet.infura.io/v3/c556e0ff7c86470abb716b006dc25404"
    )
  );

  const account = client.eth.accounts.privateKeyToAccount(privateKey);
  const balance = client.utils.fromWei(
    await client.eth.getBalance(account.address),
    "ether"
  );

  log.info(
    "Created Web3 instance:\n\t\t" +
      `addr    = ${account.address}\n\t\t` +
      `balance = ${parseFloat(balance).toFixed(3)} ETH`
  );

  return { client, addr: account.address, sign: account.signTransaction };
}

export const latestTxs = async (
  client: Web3,
  addr: string,
  latest: {
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
  latest: {
    block: number;
    txID: string;
  };
}> => {
  const txs: {
    id: string;
    block: number;
    sender: string;
    type: string;
    table?: string;
    order?: string;
    arAmnt?: number;
    amnt?: number;
    rate?: number;
  }[] = [];

  const latestBlock = await client.eth.getBlock("latest");
  let newLatest = latest;

  for (
    let blockNumber = latest.block;
    blockNumber <= latestBlock.number;
    blockNumber++
  ) {
    const block = await client.eth.getBlock(blockNumber);
    if (block) {
      newLatest = {
        block: blockNumber,
        txID: block.transactions[0],
      };

      let blockTxs = block.transactions.reverse();

      const index = blockTxs.indexOf(latest.txID);
      blockTxs = blockTxs.splice(index + 1, blockTxs.length);

      for (const txID of blockTxs) {
        const tx = await client.eth.getTransaction(txID);
        if (tx.to === addr) {
          txs.push({
            id: txID,
            block: blockNumber,
            sender: tx.from,
            type: "Swap",
            table: "ETH",
            amnt: parseFloat(client.utils.fromWei(tx.value, "ether")),
          });
        }
      }
    }
  }

  return { txs, latest: newLatest };
};
