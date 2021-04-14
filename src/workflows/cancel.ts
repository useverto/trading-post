import Log from "@utils/logger";
import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { Database } from "sqlite";
import { query } from "@utils/gql";
import txQuery from "../queries/tx.gql";
import { getOrder } from "@utils/database";
import { readContract } from "smartweave";

const log = new Log({
  level: Log.Levels.debug,
  name: "cancel",
});

export async function cancel(
  client: Arweave,
  cancelID: string,
  txID: string,
  jwk: JWKInterface,
  db: Database
) {
  const cancelTx = (
    await query({
      query: txQuery,
      variables: {
        txID: cancelID,
      },
    })
  ).data.transaction;

  const tx = (
    await query({
      query: txQuery,
      variables: {
        txID,
      },
    })
  ).data.transaction;

  if (tx.owner.address !== cancelTx.owner.address) {
    log.error("Sender of cancel tx isn't owner of order.");
    return;
  }

  const type = tx.tags.find(
    (tag: { name: string; value: string }) => tag.name === "Type"
  ).value;
  let tokenTag: string;
  if (type === "Buy") tokenTag = "Token";
  if (type === "Sell") tokenTag = "Contract";
  if (type === "Swap") tokenTag = "Chain";
  const token = tx.tags.find(
    (tag: { name: string; value: string }) => tag.name === tokenTag
  ).value;

  const order = await getOrder(db, token, txID);

  if (type === "Buy") {
    const tx = await client.createTransaction(
      {
        target: order.addr,
        quantity: client.ar.arToWinston(order.amnt.toString()),
      },
      jwk
    );

    tx.addTag("Exchange", "Verto");
    tx.addTag("Type", "Cancel-AR-Transfer");
    tx.addTag("Order", txID);

    await client.transactions.sign(tx, jwk);
    await client.transactions.post(tx);

    await db.run(`DELETE FROM "${token}" WHERE txID = "${txID}"`);

    log.info(
      "Cancelled!" +
        `\n\t\torder = ${txID}` +
        "\n" +
        `\n\t\tSent ${order.amnt} AR back to ${order.addr}` +
        `\n\t\ttxID = ${tx.id}`
    );
  } else if (type === "Sell") {
    const tags = {
      Exchange: "Verto",
      Type: "Cancel-PST-Transfer",
      Order: txID,
      "App-Name": "SmartWeaveAction",
      "App-Version": "0.3.0",
      Contract: token,
      Input: JSON.stringify({
        function: "transfer",
        target: order.addr,
        qty: order.amnt,
      }),
    };

    const tx = await client.createTransaction(
      {
        target: order.addr,
        data: Math.random().toString().slice(-4),
      },
      jwk
    );

    for (const [key, value] of Object.entries(tags)) {
      tx.addTag(key, value.toString());
    }

    await client.transactions.sign(tx, jwk);
    await client.transactions.post(tx);

    await db.run(`DELETE FROM "${token}" WHERE txID = "${txID}"`);

    const ticker = (await readContract(client, token)).ticker;
    log.info(
      "Cancelled!" +
        `\n\t\torder = ${txID}` +
        "\n" +
        `\n\t\tSent ${order.amnt} ${ticker} back to ${order.addr}` +
        `\n\t\ttxID = ${tx.id}`
    );
  } else if (type === "Swap") {
    const hash = tx.tags.find(
      (tag: { name: string; value: string }) => tag.name === "Hash"
    );

    if (hash) {
      // This was an ETH -> AR swap
      // TODO
    } else {
      // This was an AR -> ETH swap
      const tx = await client.createTransaction(
        {
          target: order.addr,
          quantity: client.ar.arToWinston(order.amnt.toString()),
        },
        jwk
      );
  
      tx.addTag("Exchange", "Verto");
      tx.addTag("Type", "Cancel-AR-Transfer");
      tx.addTag("Order", txID);
  
      await client.transactions.sign(tx, jwk);
      await client.transactions.post(tx);
  
      await db.run(`DELETE FROM "${token}" WHERE txID = "${txID}"`);
  
      log.info(
        "Cancelled!" +
          `\n\t\torder = ${txID}` +
          "\n" +
          `\n\t\tSent ${order.amnt} AR back to ${order.addr}` +
          `\n\t\ttxID = ${tx.id}`
      );
    }
  } else {
    log.error("Invalid order type.");
  }
}
