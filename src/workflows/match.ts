import Log from "@utils/logger";
import Arweave from "arweave";
import { Database } from "sqlite";
import { query } from "@utils/gql";
import txQuery from "../queries/tx.gql";
import { TokenInstance } from "@utils/database";

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
    const orders = await db.get<TokenInstance[]>(`
      SELECT * FROM "${token}" WHERE type = "Sell"
    `);

    if (!orders || orders?.length === 0) {
      log.info("No sell orders to match with.");
      return;
    }

    orders?.sort((a, b) => {
      // @ts-ignore
      return a.rate - b.rate;
    });

    // TODO(@johnletey): Go through and make trades ...
  } else if (opcode === "Sell") {
    await db.run(`INSERT INTO "${token}" VALUES (?, ?, ?, ?, ?)`, [
      txId,
      amnt,
      rate,
      tx.owner.address,
      opcode,
    ]);
  } else {
    log.error(`Invalid trade opCode.`);
  }
}
