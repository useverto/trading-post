import Log from "@utils/logger";
import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { Database } from "sqlite";
import { query } from "@utils/gql";
import txQuery from "../queries/tx.gql";
import { SwapInstance, saveSwap } from "@utils/database";

const log = new Log({
  level: Log.Levels.debug,
  name: "swap",
});

export async function swap(
  client: Arweave,
  txID: string,
  jwk: JWKInterface,
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

  const swapEntry: SwapInstance = {
    txID,
    amnt,
    rate,
    addr,
    // @ts-ignore
    type,
    createdAt: new Date(),
    received,
  };
  await saveSwap(db, chain, swapEntry);

  // TODO(@johnletey): Match the swap
}
