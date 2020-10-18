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

const log = new Log({
  level: Log.Levels.debug,
  name: "swap",
});

export async function swap(
  client: Arweave,
  ethClient: Web3,
  txID: string,
  jwk: JWKInterface,
  privateKey: string,
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

        const ethTx = await ethClient.eth.accounts.signTransaction(
          {
            to: addr,
            value: ethClient.utils.toWei(ethAmount.toString(), "ether"),
            // TODO(@johnletey): May need to set `gas` here.
          },
          privateKey
        );
        const ethTxID = (
          await ethClient.eth.sendSignedTransaction(ethTx.rawTransaction!)
        ).transactionHash;

        log.info(
          "Matched!" +
            `\n\t\tSent ${amnt} AR to ${order.addr}` +
            `\n\t\ttxID = ${arTx.id}` +
            "\n" +
            `\n\t\tSent ${ethAmount} ${chain} to ${addr}` +
            `\n\t\ttxID = ${ethTxID}`
        );

        if (order.amnt === ethAmount) {
          await db.run(`DELETE FROM "${chain}" WHERE txID = ?`, [order.txID]);
          // TODO(@johnletey): Send confirmation.
        } else {
          await db.run(
            `UPDATE "${chain}" SET amnt = ?, received = ? WHERE txID = ?`,
            [order.amnt - ethAmount, order.received + amnt, order.txID]
          );
        }
        await db.run(`DELETE FROM "${chain}" WHERE txID = ?`, [txID]);
        // TODO(@johnletey): Send confirmation.

        return;
      } else {
        const arTx = await client.createTransaction(
          {
            target: order.addr,
            quantity: client.ar.arToWinston(
              (order.amnt / order.rate).toString()
            ),
          },
          jwk
        );
        await client.transactions.sign(arTx, jwk);
        await client.transactions.post(arTx);

        const ethTx = await ethClient.eth.accounts.signTransaction(
          {
            to: addr,
            value: ethClient.utils.toWei(order.amnt.toString(), "ether"),
            // TODO(@johnletey): May need to set `gas` here.
          },
          privateKey
        );
        const ethTxID = (
          await ethClient.eth.sendSignedTransaction(ethTx.rawTransaction!)
        ).transactionHash;

        log.info(
          "Matched!" +
            `\n\t\tSent ${order.amnt / order.rate} AR to ${order.addr}` +
            `\n\t\ttxID = ${arTx.id}` +
            "\n" +
            `\n\t\tSent ${order.amnt} ${chain} to ${addr}` +
            `\n\t\ttxID = ${ethTxID}`
        );

        await db.run(
          `UPDATE "${chain}" SET amnt = ?, received = ? WHERE txID = ?`,
          [amnt - order.amnt / order.rate, received + order.amnt, txID]
        );
        amnt -= order.amnt / order.rate;
        received += order.amnt;
        await db.run(`DELETE FROM "${chain}" WHERE txID = ?`, [order.txID]);
        // TODO(@johnletey): Send confirmation.
      }
    }
  } else {
    const orders = await getBuyOrders(db, chain);
    for (const order of orders) {
      if (order.amnt >= amnt / rate) {
        const arTx = await client.createTransaction(
          {
            target: tx.owner.address,
            quantity: client.ar.arToWinston((amnt / rate).toString()),
          },
          jwk
        );
        await client.transactions.sign(arTx, jwk);
        await client.transactions.post(arTx);

        const ethTx = await ethClient.eth.accounts.signTransaction(
          {
            to: order.addr,
            value: ethClient.utils.toWei(amnt.toString(), "ether"),
            // TODO(@johnletey): May need to set `gas` here.
          },
          privateKey
        );
        const ethTxID = (
          await ethClient.eth.sendSignedTransaction(ethTx.rawTransaction!)
        ).transactionHash;

        log.info(
          "Matched!" +
            `\n\t\tSent ${amnt / rate} AR to ${addr}` +
            `\n\t\ttxID = ${arTx.id}` +
            "\n" +
            `\n\t\tSent ${amnt} ${chain} to ${order.addr}` +
            `\n\t\ttxID = ${ethTxID}`
        );

        if (order.amnt === amnt / rate) {
          await db.run(`DELETE FROM "${chain}" WHERE txID = ?`, [order.txID]);
          // TODO(@johnletey): Send confirmation.
        } else {
          await db.run(
            `UPDATE "${chain}" SET amnt = ?, received = ? WHERE txID = ?`,
            [order.amnt - amnt / rate, order.received + amnt, order.txID]
          );
        }
        await db.run(`DELETE FROM "${chain}" WHERE txID = ?`, [txID]);
        // TODO(@johnletey): Send confirmation.

        return;
      } else {
        const arTx = await client.createTransaction(
          {
            target: tx.owner.address,
            quantity: client.ar.arToWinston(order.amnt.toString()),
          },
          jwk
        );
        await client.transactions.sign(arTx, jwk);
        await client.transactions.post(arTx);

        const ethTx = await ethClient.eth.accounts.signTransaction(
          {
            to: order.addr,
            value: ethClient.utils.toWei(
              (order.amnt * rate).toString(),
              "ether"
            ),
            // TODO(@johnletey): May need to set `gas` here.
          },
          privateKey
        );
        const ethTxID = (
          await ethClient.eth.sendSignedTransaction(ethTx.rawTransaction!)
        ).transactionHash;

        log.info(
          "Matched!" +
            `\n\t\tSent ${order.amnt} AR to ${addr}` +
            `\n\t\ttxID = ${arTx.id}` +
            "\n" +
            `\n\t\tSent ${order.amnt * rate} ${chain} to ${order.addr}` +
            `\n\t\ttxID = ${ethTxID}`
        );

        await db.run(
          `UPDATE "${chain}" SET amnt = ?, received = ? WHERE txID = ?`,
          [amnt - order.amnt * rate, received + order.amnt, txID]
        );
        amnt -= order.amnt * rate;
        received += order.amnt;
        await db.run(`DELETE FROM "${chain}" WHERE txID = ?`, [order.txID]);
        // TODO(@johnletey): Send confirmation.
      }
    }
  }
}
