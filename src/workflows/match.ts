import Log from "@utils/logger";
import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { Database } from "sqlite";
import { query } from "@utils/gql";
import txQuery from "../queries/tx.gql";
import {
  TokenInstance,
  saveOrder,
  getSellOrders,
  getBuyOrders,
} from "@utils/database";
import { interactWrite } from "smartweave";

const log = new Log({
  level: Log.Levels.debug,
  name: "match",
});

function validateAsInt(...data: (string | number)[]) {
  return !data
    .map((x) => Number.isInteger(typeof x == "number" ? x : parseFloat(x)))
    .includes(false);
}

async function sendConfirmation(
  client: Arweave,
  txId: string,
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
  confirmationTx.addTag("Match", txId);
  confirmationTx.addTag("Received", received);

  await client.transactions.sign(confirmationTx, jwk);
  await client.transactions.post(confirmationTx);
}

export async function match(
  client: Arweave,
  txId: string,
  jwk: JWKInterface,
  db: Database
) {
  const tx = (
    await query({
      query: txQuery,
      variables: {
        txId,
      },
    })
  ).data.transaction;

  const opcode = tx.tags.find((tag: any) => tag.name === "Type")?.value!;

  let amnt =
    opcode === "Buy"
      ? tx.quantity.ar
      : JSON.parse(tx.tags.find((tag: any) => tag.name === "Input")?.value!)[
          "qty"
        ];
  const tokenTag = opcode === "Buy" ? "Token" : "Contract";
  const token = tx.tags.find((tag: any) => tag.name === tokenTag)?.value!;
  const ticker = JSON.parse(
    (
      await client.transactions.getData(token, {
        decode: true,
        string: true,
      })
    ).toString()
  )["ticker"];

  const rate = tx.tags.find((tag: any) => tag.name === "Rate")?.value!;

  if (!validateAsInt(amnt, rate)) return;
  log.info(`Received trade.\n\t\ttxId = ${txId}\n\t\topCode = ${opcode}`);

  const tokenEntry: TokenInstance = {
    txID: txId,
    amnt,
    rate,
    addr: tx.owner.address,
    type: opcode,
    createdAt: new Date(),
  };
  await saveOrder(db, token, tokenEntry);

  if (opcode === "Buy") {
    const orders = await getSellOrders(db, token);
    for (const order of orders) {
      if (!order.rate) continue;
      const pstAmount = amnt * order.rate;
      if (order.amnt >= pstAmount) {
        const arTx = await client.createTransaction(
          {
            target: order.addr,
            quantity: client.ar.arToWinston(amnt),
          },
          jwk
        );
        await client.transactions.sign(arTx, jwk);
        await client.transactions.post(arTx);

        const pstTx = await interactWrite(
          client,
          jwk,
          token,
          `{"function": "transfer", "target": "${tx.owner.address}", "qty": ${pstAmount}}`
        );

        log.info(
          "Matched!" +
            `\n\t\tSent ${amnt} AR to ${order.addr}` +
            `\n\t\ttxId = ${arTx.id}` +
            "\n" +
            `\n\t\tSent ${pstAmount} ${ticker} to ${tx.owner.address}` +
            `\n\t\ttxId = ${pstTx}`
        );

        if (order.amnt === pstAmount) {
          /**
           * Delete an order.
           * NOTE: Table names are not subject to sql injections.
           */
          await db.run(`DELETE FROM "${token}" WHERE txID = ?`, [order.txID]);
          await sendConfirmation(client, order.txID, `${amnt} AR`, jwk);
        } else {
          /**
           * Update an order.
           * NOTE: Table names are not subject to sql injections
           */
          await db.run(`UPDATE "${token}" SET amnt = ? WHERE txID = ?`, [
            order.amnt - pstAmount,
            order.txID,
          ]);
        }
        /**
         * Delete an order.
         * NOTE: Table names are not subject to sql injections
         */
        await db.run(`DELETE FROM "${token}" WHERE txID = ?`, [txId]);
        await sendConfirmation(client, txId, `${pstAmount} ${ticker}`, jwk);

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

        const pstTx = await interactWrite(
          client,
          jwk,
          token,
          `{"function": "transfer", "target": "${tx.owner.address}", "qty": ${order.amnt}}`
        );

        log.info(
          "Matched!" +
            `\n\t\tSent ${order.amnt / order.rate} AR to ${order.addr}` +
            `\n\t\ttxId = ${arTx.id}` +
            "\n" +
            `\n\t\tSent ${order.amnt} ${ticker} to ${tx.owner.address}` +
            `\n\t\ttxId = ${pstTx}`
        );
        /**
         * Update an order.
         * NOTE: Table names are not subject to sql injections
         */
        await db.run(`UPDATE "${token}" SET amnt = ? WHERE txID = ?`, [
          amnt - order.amnt / order.rate,
          txId,
        ]);
        amnt -= order.amnt / order.rate;
        /**
         * Delete an order.
         * NOTE: Table names are not subject to sql injections
         */
        await db.run(`DELETE FROM "${token}" WHERE txID = ?`, [order.txID]);
        await sendConfirmation(
          client,
          order.txID,
          `${order.amnt / order.rate} AR`,
          jwk
        );
      }
    }
  } else if (opcode === "Sell") {
    const orders = await getBuyOrders(db, token);
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

        const pstTx = await interactWrite(
          client,
          jwk,
          token,
          `{"function": "transfer", "target": "${order.addr}", "qty": ${amnt}}`
        );

        log.info(
          "Matched!" +
            `\n\t\tSent ${amnt / rate} AR to ${tx.owner.address}` +
            `\n\t\ttxId = ${arTx.id}` +
            "\n" +
            `\n\t\tSent ${amnt} ${ticker} to ${order.addr}` +
            `\n\t\ttxId = ${pstTx}`
        );

        if (order.amnt === amnt / rate) {
          /**
           * Delete an order.
           * NOTE: Table names are not subject to sql injections
           */
          await db.run(`DELETE FROM "${token}" WHERE txID = ?`, [order.txID]);
          await sendConfirmation(client, order.txID, `${amnt} ${ticker}`, jwk);
        } else {
          /**
           * Update an order.
           * NOTE: Table names are not subject to sql injections
           */
          await db.run(`UPDATE "${token}" SET amnt = ? WHERE txID = ?`, [
            order.amnt - amnt / rate,
            order.txID,
          ]);
        }
        await db.run(`DELETE FROM "${token}" WHERE txID = ?`, [txId]);
        await sendConfirmation(client, txId, `${amnt / rate} AR`, jwk);

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

        const pstTx = await interactWrite(
          client,
          jwk,
          token,
          `{"function": "transfer", "target": "${order.addr}", "qty": ${
            order.amnt * rate
          }}`
        );

        log.info(
          "Matched!" +
            `\n\t\tSent ${order.amnt} AR to ${tx.owner.address}` +
            `\n\t\ttxId = ${arTx.id}` +
            "\n" +
            `\n\t\tSent ${order.amnt * rate} ${ticker} to ${order.addr}` +
            `\n\t\ttxId = ${pstTx}`
        );
        /**
         * Update an order.
         * NOTE: Table names are not subject to sql injections
         */
        await db.run(`UPDATE "${token}" SET amnt = ? WHERE txID = ?`, [
          amnt - order.amnt * rate,
          txId,
        ]);
        amnt -= order.amnt * rate;
        /**
         * Delete an order.
         * NOTE: Table names are not subject to sql injections
         */
        await db.run(`DELETE FROM "${token}" WHERE txID = ?`, [order.txID]);
        await sendConfirmation(
          client,
          order.txID,
          `${order.amnt * rate} ${ticker}`,
          jwk
        );
      }
    }
  } else {
    log.error(`Invalid trade opCode.`);
  }
}
