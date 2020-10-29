import Log from "@utils/logger";
import Arweave from "arweave";
import Web3 from "web3";
import { JWKInterface } from "arweave/node/lib/wallet";
import { Database } from "sqlite";
import {
  OrderInstance,
  saveOrder,
  getSellOrders,
  getBuyOrders,
} from "@utils/database";
import { getArAddr, getChainAddr } from "@utils/arweave";

const log = new Log({
  level: Log.Levels.debug,
  name: "swap",
});

async function sendConfirmation(
  client: Arweave,
  txID: string,
  received: string,
  jwk: JWKInterface
) {
  const confirmationTx = await client.createTransaction(
    {
      data: Math.random().toString().slice(-4),
    },
    jwk
  );

  confirmationTx.addTag("Exchange", "Verto");
  confirmationTx.addTag("Type", "Confirmation");
  confirmationTx.addTag("Swap", txID);
  confirmationTx.addTag("Received", received);

  await client.transactions.sign(confirmationTx, jwk);
  await client.transactions.post(confirmationTx);
}

export async function ethSwap(
  client: Arweave,
  ethClient: Web3,
  tx: {
    id: string;
    sender: string;
    table: string;
    arAmnt?: number;
    amnt?: number;
    rate?: number;
  },
  jwk: JWKInterface,
  // TODO(@johnletey): Look into the type
  sign: any,
  db: Database
) {
  let type = tx.arAmnt ? "Buy" : "Sell";

  let amnt = type === "Buy" ? tx.arAmnt! : tx.amnt!;
  let rate = tx.rate;

  let addr =
    type === "Buy"
      ? (await getChainAddr(tx.sender, tx.table))!
      : (await getArAddr(tx.sender, tx.table))!;

  let received = 0;

  let chain = tx.table;

  log.info(
    `Received swap.\n\t\ttxID = ${tx.id}\n\t\tchain = ${chain}\n\t\ttype = ${type}`
  );

  const swapEntry: OrderInstance = {
    txID: tx.id,
    amnt,
    rate,
    addr,
    // @ts-ignore
    type,
    createdAt: new Date(),
    received,
  };
  await saveOrder(db, chain, swapEntry);

  if (type === "Buy") {
    const orders = await getSellOrders(db, chain);
    for (const order of orders) {
      const ethAmount = amnt * rate!;
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

        const ethTx = await sign({
          to: addr,
          value: ethClient.utils.toWei(ethAmount.toString(), "ether"),
          gas: 21000,
        });
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
          await sendConfirmation(
            client,
            order.txID,
            `${order.received + amnt} AR`,
            jwk
          );
        } else {
          await db.run(
            `UPDATE "${chain}" SET amnt = ?, received = ? WHERE txID = ?`,
            [order.amnt - ethAmount, order.received + amnt, order.txID]
          );
        }
        await db.run(`DELETE FROM "${chain}" WHERE txID = ?`, [tx.id]);
        await sendConfirmation(
          client,
          tx.id,
          `${received + ethAmount} ${chain}`,
          jwk
        );

        return;
      } else {
        const arTx = await client.createTransaction(
          {
            target: order.addr,
            quantity: client.ar.arToWinston((order.amnt / rate!).toString()),
          },
          jwk
        );
        await client.transactions.sign(arTx, jwk);
        await client.transactions.post(arTx);

        const ethTx = await sign({
          to: addr,
          value: ethClient.utils.toWei(order.amnt.toString(), "ether"),
          gas: 21000,
        });
        const ethTxID = (
          await ethClient.eth.sendSignedTransaction(ethTx.rawTransaction!)
        ).transactionHash;

        log.info(
          "Matched!" +
            `\n\t\tSent ${order.amnt / rate!} AR to ${order.addr}` +
            `\n\t\ttxID = ${arTx.id}` +
            "\n" +
            `\n\t\tSent ${order.amnt} ${chain} to ${addr}` +
            `\n\t\ttxID = ${ethTxID}`
        );

        await db.run(
          `UPDATE "${chain}" SET amnt = ?, received = ? WHERE txID = ?`,
          [amnt - order.amnt / rate!, received + order.amnt, tx.id]
        );
        amnt -= order.amnt / rate!;
        received += order.amnt;

        await db.run(`DELETE FROM "${chain}" WHERE txID = ?`, [order.txID]);
        await sendConfirmation(
          client,
          order.txID,
          `${order.received + order.amnt / rate!} AR`,
          jwk
        );
      }
    }
  } else {
    const orders = await getBuyOrders(db, chain);
    for (const order of orders) {
      if (!order.rate) continue;
      if (order.amnt >= amnt / order.rate) {
        const arTx = await client.createTransaction(
          {
            target: addr,
            quantity: client.ar.arToWinston((amnt / order.rate).toString()),
          },
          jwk
        );
        await client.transactions.sign(arTx, jwk);
        await client.transactions.post(arTx);

        const ethTx = await sign({
          to: order.addr,
          value: ethClient.utils.toWei(amnt.toString(), "ether"),
          gas: 21000,
        });
        const ethTxID = (
          await ethClient.eth.sendSignedTransaction(ethTx.rawTransaction!)
        ).transactionHash;

        log.info(
          "Matched!" +
            `\n\t\tSent ${amnt / order.rate} AR to ${addr}` +
            `\n\t\ttxID = ${arTx.id}` +
            "\n" +
            `\n\t\tSent ${amnt} ${chain} to ${order.addr}` +
            `\n\t\ttxID = ${ethTxID}`
        );

        if (order.amnt === amnt / order.rate) {
          await db.run(`DELETE FROM "${chain}" WHERE txID = ?`, [order.txID]);
          await sendConfirmation(
            client,
            order.txID,
            `${order.received + amnt} ${chain}`,
            jwk
          );
        } else {
          await db.run(
            `UPDATE "${chain}" SET amnt = ?, received = ? WHERE txID = ?`,
            [order.amnt - amnt / order.rate, order.received + amnt, order.txID]
          );
        }
        await db.run(`DELETE FROM "${chain}" WHERE txID = ?`, [tx.id]);
        await sendConfirmation(
          client,
          tx.id,
          `${received + amnt / order.rate} AR`,
          jwk
        );

        return;
      } else {
        const arTx = await client.createTransaction(
          {
            target: addr,
            quantity: client.ar.arToWinston(order.amnt.toString()),
          },
          jwk
        );
        await client.transactions.sign(arTx, jwk);
        await client.transactions.post(arTx);

        const ethTx = await sign({
          to: order.addr,
          value: ethClient.utils.toWei(
            (order.amnt * order.rate).toString(),
            "ether"
          ),
          gas: 21000,
        });
        const ethTxID = (
          await ethClient.eth.sendSignedTransaction(ethTx.rawTransaction!)
        ).transactionHash;

        log.info(
          "Matched!" +
            `\n\t\tSent ${order.amnt} AR to ${addr}` +
            `\n\t\ttxID = ${arTx.id}` +
            "\n" +
            `\n\t\tSent ${order.amnt * order.rate} ${chain} to ${order.addr}` +
            `\n\t\ttxID = ${ethTxID}`
        );

        await db.run(
          `UPDATE "${chain}" SET amnt = ?, received = ? WHERE txID = ?`,
          [amnt - order.amnt * order.rate, received + order.amnt, tx.id]
        );
        amnt -= order.amnt * order.rate;
        received += order.amnt;

        await db.run(`DELETE FROM "${chain}" WHERE txID = ?`, [order.txID]);
        await sendConfirmation(
          client,
          order.txID,
          `${order.received + order.amnt * order.rate} ${chain}`,
          jwk
        );
      }
    }
  }
}
