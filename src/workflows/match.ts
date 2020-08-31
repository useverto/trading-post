import Log from "@utils/logger";
import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { Database } from "sqlite";
import { query } from "@utils/gql";
import txQuery from "../queries/tx.gql";
import { TokenInstance, saveOrder, getOrder } from "@utils/database";
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
  const amnt = tx.tags.find((tag: any) => tag.name === "Amnt")?.value!;
  const token = tx.tags.find((tag: any) => tag.name === "Target-Token")?.value!;
  const rate = tx.tags.find((tag: any) => tag.name === "Rate")?.value!;

  log.info(`Received trade.\n\t\ttxId = ${txId}\n\t\topCode = ${opcode}`);

  const tokenEntry: TokenInstance = {
    txID: txId,
    amnt,
    rate,
    addr: tx.owner.address,
    type: opcode,
  };
  await saveOrder(db, token, tokenEntry);

  if (opcode === "Buy") {
    const orders = await getOrder(db, token, opcode);
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
        await db.run(`DELETE FROM "${token}" WHERE txID = ?`, [order.txID]);
      }
    }
  } else if (opcode === "Sell") {
    // TODO: Write down what needs to be done here lol
  } else {
    log.error(`Invalid trade opCode.`);
  }
}
