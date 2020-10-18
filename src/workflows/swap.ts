import Log from "@utils/logger";
import Arweave from "arweave";
import Web3 from "web3";
import { JWKInterface } from "arweave/node/lib/wallet";
import { Database } from "sqlite";
import { query } from "@utils/gql";
import txQuery from "../queries/tx.gql";
import {
  OrderInstance,
  saveOrder,
  getSellOrders,
  getBuyOrders,
} from "@utils/database";
import { Transaction } from "ethereumjs-tx";

const log = new Log({
  level: Log.Levels.debug,
  name: "swap",
});

export async function swap(
  client: Arweave,
  ethClient: Web3,
  txID: string,
  jwk: JWKInterface,
  privateKey: Buffer,
  db: Database
) {
  const tx = (
    await query({
      query: txQuery,
      variables: {
        txID,
      },
    })
  ).data.transaction;

  const chain = tx.tags.find(
    (tag: { name: string; value: string }) => tag.name === "Chain"
  ).value;

  let type = "Buy";
  let amnt = parseFloat(tx.quantity.ar);
  if (amnt === 0) {
    type = "Sell";
    amnt = tx.tags.find(
      (tag: { name: string; value: string }) => tag.name === "Amount"
    ).value;
  }

  let rate = tx.tags.find(
    (tag: { name: string; value: string }) => tag.name === "Rate"
  )?.value;

  let addr =
    type === "Buy"
      ? tx.tags.find(
          (tag: { name: string; value: string }) => tag.name === "Transfer"
        ).value
      : tx.owner.address;

  let received = 0;

  log.info(
    `Received swap.\n\t\ttxID = ${txID}\n\t\tchain = ${chain}\n\t\ttype = ${type}`
  );

  const swapEntry: OrderInstance = {
    txID,
    amnt,
    rate,
    addr,
    // @ts-ignore
    type,
    createdAt: new Date(),
    received,
  };
  await saveOrder(db, chain, swapEntry);

  // TODO(@johnletey): Make sure chain is supported by TP.
  if (type === "Buy") {
    const orders = await getSellOrders(db, chain);
    for (const order of orders) {
      if (!order.rate) continue;
      const ethAmount = amnt * order.rate;
      // TODO(@johnletey): Implement this ...
      if (order.amnt >= ethAmount) {
        const arTx = await client.createTransaction(
          {
            target: order.addr,
            quantity: client.ar.arToWinston(amnt.toString()),
          },
          jwk
        );
        await client.transactions.sign(arTx, jwk);
        await client.transactions.post(arTx);

        const txCount = await ethClient.eth.getTransactionCount(
          ethClient.eth.accounts.privateKeyToAccount(privateKey.toString())
            .address
        );
        const options = {
          nonce: ethClient.utils.toHex(txCount),
          to: addr,
          value: ethClient.utils.toWei(ethAmount.toString(), "ether"),
          // gasLimit
          // gasPrice
        };

        const tx = new Transaction(options);
        tx.sign(privateKey);

        const serializedTx = tx.serialize();
        const raw = "0x" + serializedTx.toString("hex");

        const ethTxID = await ethClient.eth.sendSignedTransaction(raw);

        // TODO(@johnletey): Deal with the rest ...
      } else {
      }
    }
  } else {
    const orders = await getBuyOrders(db, chain);
    for (const order of orders) {
      // TODO(@johnletey): Implement this ...
      if (order.amnt >= amnt / rate) {
      } else {
      }
    }
  }
}
