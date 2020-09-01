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

  // TODO(@johnletey): Update some of these tags once frontend is updated
  const opcode = tx.tags.find((tag: any) => tag.name === "Trade-Opcode")
    ?.value!;
  let amnt = tx.tags.find((tag: any) => tag.name === "Amnt")?.value!;
  const token = tx.tags.find((tag: any) => tag.name === "Target-Token")?.value!;
  const rate = tx.tags.find((tag: any) => tag.name === "Rate")?.value!;

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
      const pstAmount = order.rate * amnt;
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

        log.info(`Sent ${amnt} AR to ${order.addr}\n\t\ttxId = ${arTx.id}`);
        log.info(
          `Sent ${pstAmount} ${
            JSON.parse(
              (
                await client.transactions.getData(token, {
                  decode: true,
                  string: true,
                })
              ).toString()
            )["ticker"]
          } to ${tx.owner.address}\n\t\ttxId = ${pstTx}`
        );

        if (order.amnt === pstAmount) {
          await db.run(`DELETE FROM "${token}" WHERE txID = ?`, [order.txID]);
        } else {
          await db.run(`UPDATE "${token}" SET amnt = ? WHERE txID = ?`, [
            order.amnt - pstAmount,
            order.txID,
          ]);
        }
        await db.run(`DELETE FROM "${token}" WHERE txID = ?`, [txId]);

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

        // TODO(@johnletey): Add logs

        await db.run(`UPDATE "${token}" SET amnt = ? WHERE txID = ?`, [
          amnt - order.amnt / order.rate,
          txId,
        ]);
        amnt -= order.amnt / order.rate;
        await db.run(`DELETE FROM "${token}" WHERE txID = ?`, [order.txID]);
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

        // TODO(@johnletey): Add logs

        if (order.amnt === amnt / rate) {
          await db.run(`DELETE FROM "${token}" WHERE txID = ?`, [order.txID]);
        } else {
          await db.run(`UPDATE "${token}" SET amnt = ? WHERE txID = ?`, [
            order.amnt - amnt / rate,
            order.txID,
          ]);
        }
        await db.run(`DELETE FROM "${token}" WHERE txID = ?`, [txId]);

        return;
        // If buy order is less than sell order worth
      } else {
        //    Fill buy order
        //    Partially fill sell order
        //    Remove buy order from DB
        //    Keep sell order but subtract amount from buy order's worth
      }
    }
  } else {
    log.error(`Invalid trade opCode.`);
  }
}
