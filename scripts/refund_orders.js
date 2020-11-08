const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const fs = require("fs");
const Arweave = require("arweave");

// --- EDIT THESE --- //
const DB_FILE = "./db.db";
const KEYFILE = "./arweave.json";
// ------------------ //

const refundOrders = async (token) => {
  const db = await open({
    filename: DB_FILE,
    driver: sqlite3.Database,
  });
  const jwk = JSON.parse(await fs.readFileSync(KEYFILE));
  const client = new Arweave({
    host: "arweave.net",
    port: 443,
    protocol: "https",
  });

  const orders = await db.all(`SELECT * FROM "${token}"`);

  for (const order of orders) {
    if (order.type === "Buy") {
      const tx = await client.createTransaction(
        {
          target: order.addr,
          quantity: client.ar.arToWinston(order.amnt.toString()),
        },
        jwk
      );
      await client.transactions.sign(tx, jwk);
      await client.transactions.post(tx);
    }

    if (order.type === "Sell") {
      const tags = {
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
    }

    await db.run(`DELETE FROM "${token}" WHERE txID = ?`, [order.txID]);
  }
};

refundOrders(/* insert token id */);
