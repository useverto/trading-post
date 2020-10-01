import Log from "@utils/logger";
import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { Database } from "sqlite";
import { query } from "@utils/gql";
import txQuery from "../queries/tx.gql";
import { getOrder } from "@utils/database";

const log = new Log({
  level: Log.Levels.debug,
  name: "cancel",
});

export async function cancel(
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

  const type = tx.tags.find(
    (tag: { name: string; value: string }) => tag.name === "Type"
  ).value;

  const order = await getOrder(db, txID);

  if (type === "Buy") {
    const tx = await client.createTransaction(
      {
        target: order.addr,
        quantity: client.ar.arToWinston(order.amnt.toString()),
      },
      jwk
    );

    await client.transactions.sign(tx, jwk);
    await client.transactions.post(tx);
  } else if (type === "Sell") {
  } else {
    log.error(`Invalid order type.`);
  }

  return;
}
