import Log from "@utils/logger";
import Arweave from "arweave";
import { Database } from "sqlite";
import { query } from "@utils/gql";
import txQuery from "../queries/tx.gql";
import { TokenInstance, saveOrder, getOrder } from "@utils/database";

const log = new Log({
  level: Log.Levels.debug,
  name: "match",
});

export async function match(client: Arweave, txId: string, db: Database) {
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

  if (opcode === "Buy") {
    const orders = await getOrder(db, token);
    for (const order of orders) {
      if (!order.rate) continue;
      const pstAmount = order.rate * amnt;
      if (order.amnt >= pstAmount) {
        // TODO: Make the trade
        //       Update (or remove) the sell entry in the db
        //       Remove the buy entry from the db
        return;
      } else {
        // TODO: Make the trade
        //       Calculate the new amount (and update db)
        //       Remove the sell entry from the db
        //       Continue
      }
    }
  } else if (opcode === "Sell") {
    const tokenEntry: TokenInstance = {
      txID: txId,
      amnt,
      rate,
      addr: tx.owner.address,
      type: opcode,
    };
    await saveOrder(db, token, tokenEntry);
  } else {
    log.error(`Invalid trade opCode.`);
  }
}
