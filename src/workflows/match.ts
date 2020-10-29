import Log from "@utils/logger";
import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { Database } from "sqlite";
import {
  OrderInstance,
  saveOrder,
  getSellOrders,
  getBuyOrders,
} from "@utils/database";

const log = new Log({
  level: Log.Levels.debug,
  name: "match",
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
  confirmationTx.addTag("Match", txID);
  confirmationTx.addTag("Received", received);

  await client.transactions.sign(confirmationTx, jwk);
  await client.transactions.post(confirmationTx);
}

export async function match(
  client: Arweave,
  tx: {
    id: string;
    sender: string;
    type: string;
    table?: string;
    arAmnt?: number;
    amnt?: number;
    rate?: number;
  },
  jwk: JWKInterface,
  db: Database
) {
  const type = tx.type;

  let amnt = type === "Buy" ? tx.arAmnt! : tx.amnt!;
  let received = 0;
  const token = tx.table!;
  const ticker = JSON.parse(
    (
      await client.transactions.getData(token, {
        decode: true,
        string: true,
      })
    ).toString()
  ).ticker;

  let rate = tx.rate;

  log.info(`Received order.\n\t\ttxID = ${tx.id}\n\t\ttype = ${type}`);

  const tokenEntry: OrderInstance = {
    txID: tx.id,
    amnt,
    rate,
    addr: tx.sender,
    // @ts-ignore
    type,
    createdAt: new Date(),
    received,
  };
  await saveOrder(db, token, tokenEntry);

  if (type === "Buy") {
    const orders = await getSellOrders(db, token);
    for (const order of orders) {
      if (!order.rate) continue;
      const pstAmount = Math.floor(amnt * order.rate);
      if (order.amnt >= pstAmount) {
        const arTx = await client.createTransaction(
          {
            target: order.addr,
            quantity: client.ar.arToWinston(amnt.toString()),
          },
          jwk
        );
        await client.transactions.sign(arTx, jwk);
        await client.transactions.post(arTx);

        const tags = {
          Exchange: "Verto",
          Type: "PST-Transfer",
          Order: tx.id,
          "App-Name": "SmartWeaveAction",
          "App-Version": "0.3.0",
          Contract: token,
          Input: JSON.stringify({
            function: "transfer",
            target: tx.sender,
            qty: pstAmount,
          }),
        };
        const pstTx = await client.createTransaction(
          {
            target: tx.sender,
            data: Math.random().toString().slice(-4),
          },
          jwk
        );
        for (const [key, value] of Object.entries(tags)) {
          pstTx.addTag(key, value.toString());
        }
        await client.transactions.sign(pstTx, jwk);
        await client.transactions.post(pstTx);

        log.info(
          "Matched!" +
            `\n\t\tSent ${amnt} AR to ${order.addr}` +
            `\n\t\ttxID = ${arTx.id}` +
            "\n" +
            `\n\t\tSent ${pstAmount} ${ticker} to ${tx.sender}` +
            `\n\t\ttxID = ${pstTx.id}`
        );

        if (order.amnt === pstAmount) {
          /**
           * Delete an order.
           * NOTE: Table names are not subject to sql injections.
           */
          await db.run(`DELETE FROM "${token}" WHERE txID = ?`, [order.txID]);
          await sendConfirmation(
            client,
            order.txID,
            `${order.received + amnt} AR`,
            jwk
          );
        } else {
          /**
           * Update an order.
           * NOTE: Table names are not subject to sql injections
           */
          await db.run(
            `UPDATE "${token}" SET amnt = ?, received = ? WHERE txID = ?`,
            [order.amnt - pstAmount, order.received + amnt, order.txID]
          );
        }
        /**
         * Delete an order.
         * NOTE: Table names are not subject to sql injections
         */
        await db.run(`DELETE FROM "${token}" WHERE txID = ?`, [tx.id]);
        await sendConfirmation(
          client,
          tx.id,
          `${received + pstAmount} ${ticker}`,
          jwk
        );

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

        const tags = {
          Exchange: "Verto",
          Type: "PST-Transfer",
          Order: tx.id,
          "App-Name": "SmartWeaveAction",
          "App-Version": "0.3.0",
          Contract: token,
          Input: JSON.stringify({
            function: "transfer",
            target: tx.sender,
            qty: Math.floor(order.amnt),
          }),
        };
        const pstTx = await client.createTransaction(
          {
            target: tx.sender,
            data: Math.random().toString().slice(-4),
          },
          jwk
        );
        for (const [key, value] of Object.entries(tags)) {
          pstTx.addTag(key, value.toString());
        }
        await client.transactions.sign(pstTx, jwk);
        await client.transactions.post(pstTx);

        log.info(
          "Matched!" +
            `\n\t\tSent ${order.amnt / order.rate} AR to ${order.addr}` +
            `\n\t\ttxID = ${arTx.id}` +
            "\n" +
            `\n\t\tSent ${Math.floor(order.amnt)} ${ticker} to ${tx.sender}` +
            `\n\t\ttxID = ${pstTx.id}`
        );
        /**
         * Update an order.
         * NOTE: Table names are not subject to sql injections
         */
        await db.run(
          `UPDATE "${token}" SET amnt = ?, received = ? WHERE txID = ?`,
          [
            amnt - order.amnt / order.rate,
            received + Math.floor(order.amnt),
            tx.id,
          ]
        );
        amnt -= order.amnt / order.rate;
        received += Math.floor(order.amnt);
        /**
         * Delete an order.
         * NOTE: Table names are not subject to sql injections
         */
        await db.run(`DELETE FROM "${token}" WHERE txID = ?`, [order.txID]);
        await sendConfirmation(
          client,
          order.txID,
          `${order.received + order.amnt / order.rate} AR`,
          jwk
        );
      }
    }
  } else if (type === "Sell") {
    const orders = await getBuyOrders(db, token);
    for (const order of orders) {
      if (order.amnt >= amnt / rate!) {
        const arTx = await client.createTransaction(
          {
            target: tx.sender,
            quantity: client.ar.arToWinston((amnt / rate!).toString()),
          },
          jwk
        );
        await client.transactions.sign(arTx, jwk);
        await client.transactions.post(arTx);

        const tags = {
          Exchange: "Verto",
          Type: "PST-Transfer",
          Order: order.txID,
          "App-Name": "SmartWeaveAction",
          "App-Version": "0.3.0",
          Contract: token,
          Input: JSON.stringify({
            function: "transfer",
            target: order.addr,
            qty: Math.floor(amnt),
          }),
        };
        const pstTx = await client.createTransaction(
          {
            target: order.addr,
            data: Math.random().toString().slice(-4),
          },
          jwk
        );
        for (const [key, value] of Object.entries(tags)) {
          pstTx.addTag(key, value.toString());
        }
        await client.transactions.sign(pstTx, jwk);
        await client.transactions.post(pstTx);

        log.info(
          "Matched!" +
            `\n\t\tSent ${amnt / rate!} AR to ${tx.sender}` +
            `\n\t\ttxID = ${arTx.id}` +
            "\n" +
            `\n\t\tSent ${Math.floor(amnt)} ${ticker} to ${order.addr}` +
            `\n\t\ttxID = ${pstTx.id}`
        );

        if (order.amnt === amnt / rate!) {
          /**
           * Delete an order.
           * NOTE: Table names are not subject to sql injections
           */
          await db.run(`DELETE FROM "${token}" WHERE txID = ?`, [order.txID]);
          await sendConfirmation(
            client,
            order.txID,
            `${order.received + Math.floor(amnt)} ${ticker}`,
            jwk
          );
        } else {
          /**
           * Update an order.
           * NOTE: Table names are not subject to sql injections
           */
          await db.run(
            `UPDATE "${token}" SET amnt = ?, received = ? WHERE txID = ?`,
            [
              order.amnt - amnt / rate!,
              order.received + Math.floor(amnt),
              order.txID,
            ]
          );
        }
        await db.run(`DELETE FROM "${token}" WHERE txID = ?`, [tx.id]);
        await sendConfirmation(
          client,
          tx.id,
          `${received + amnt / rate!} AR`,
          jwk
        );

        return;
      } else {
        const arTx = await client.createTransaction(
          {
            target: tx.sender,
            quantity: client.ar.arToWinston(order.amnt.toString()),
          },
          jwk
        );
        await client.transactions.sign(arTx, jwk);
        await client.transactions.post(arTx);

        const tags = {
          Exchange: "Verto",
          Type: "PST-Transfer",
          Order: order.txID,
          "App-Name": "SmartWeaveAction",
          "App-Version": "0.3.0",
          Contract: token,
          Input: JSON.stringify({
            function: "transfer",
            target: order.addr,
            qty: Math.floor(order.amnt * rate!),
          }),
        };
        const pstTx = await client.createTransaction(
          {
            target: order.addr,
            data: Math.random().toString().slice(-4),
          },
          jwk
        );
        for (const [key, value] of Object.entries(tags)) {
          pstTx.addTag(key, value.toString());
        }
        await client.transactions.sign(pstTx, jwk);
        await client.transactions.post(pstTx);

        log.info(
          "Matched!" +
            `\n\t\tSent ${order.amnt} AR to ${tx.sender}` +
            `\n\t\ttxID = ${arTx.id}` +
            "\n" +
            `\n\t\tSent ${Math.floor(order.amnt * rate!)} ${ticker} to ${
              order.addr
            }` +
            `\n\t\ttxID = ${pstTx.id}`
        );
        /**
         * Update an order.
         * NOTE: Table names are not subject to sql injections
         */
        await db.run(
          `UPDATE "${token}" SET amnt = ?, received = ? WHERE txID = ?`,
          [amnt - Math.floor(order.amnt * rate!), received + order.amnt, tx.id]
        );
        amnt -= Math.floor(order.amnt * rate!);
        received += order.amnt;
        /**
         * Delete an order.
         * NOTE: Table names are not subject to sql injections
         */
        await db.run(`DELETE FROM "${token}" WHERE txID = ?`, [order.txID]);
        await sendConfirmation(
          client,
          order.txID,
          `${order.received + Math.floor(order.amnt * rate!)} ${ticker}`,
          jwk
        );
      }
    }
  } else {
    log.error("Invalid order type.");
  }
}
