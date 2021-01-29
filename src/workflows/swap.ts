import Log from "@utils/logger";
import { Database } from "sqlite";
import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import Web3 from "web3";
import { OrderInstance, saveOrder, getBuyOrders } from "@utils/database";
import { sendETH, sendAR, sendConfirmation } from "@utils/swap";

const log = new Log({
  level: Log.Levels.debug,
  name: "swap",
});

export async function ethSwap(
  tx: {
    id: string;
    sender: { ar: string; eth?: string };
    table: string;
    token?: string;
    arAmnt?: number;
    amnt?: number;
    rate?: number;
    received: number;
  },
  db: Database,
  client: Arweave,
  jwk: JWKInterface,
  ethClient: Web3,
  // TODO(@johnletey): Look into the type
  sign: any
) {
  if (tx.arAmnt) {
    // AR Incoming
    //   Not recursive
    //   Save to DB

    if (tx.sender.eth) {
      const swapEntry: OrderInstance = {
        txID: tx.id,
        amnt: tx.arAmnt,
        rate: tx.rate,
        addr: tx.sender.eth,
        type: "Buy",
        createdAt: new Date(),
        received: 0,
      };
      await saveOrder(db, tx.table, swapEntry);
    } else {
      const returnTx = await client.createTransaction(
        {
          target: tx.sender.ar,
          quantity: client.ar.arToWinston(tx.arAmnt.toString()),
        },
        jwk
      );

      returnTx.addTag("Exchange", "Verto");
      returnTx.addTag("Type", "Swap-Return");
      returnTx.addTag("Order", tx.id);

      await client.transactions.sign(returnTx, jwk);
      await client.transactions.post(returnTx);

      return;
    }
  }

  if (tx.amnt) {
    // ETH Incoming
    //   Recursive
    let amount = tx.amnt;

    //   Find first order in orderbook
    const orders = await getBuyOrders(db, tx.table);
    if (orders.length === 0) {
      const gasPrice = parseFloat(
        ethClient.utils.fromWei(await ethClient.eth.getGasPrice(), "ether")
      );
      const gas = await ethClient.eth.estimateGas({
        to: tx.sender.eth,
      });

      const ethHash = await sendETH(
        { amount: amount - gas * gasPrice, target: tx.sender.eth!, gas },
        ethClient,
        sign
      );

      return;
    }
    const order = orders[0];

    //   Calculate gas fee to send
    const gasPrice = parseFloat(
      ethClient.utils.fromWei(await ethClient.eth.getGasPrice(), "ether")
    );
    const gas = await ethClient.eth.estimateGas({
      to: order.addr,
    });

    //   Subtract gas fee from incoming ETH amount (gETH)
    amount -= gas * gasPrice;

    //   Match
    if (amount === order.amnt * order.rate!) {
      //     if gETH === order

      //       Remove order from DB
      await db.run(`DELETE FROM "${tx.table}" WHERE txID = ?`, [order.txID]);

      //       Send ETH/AR in corresponding locations & confirmation transactions
      const ethHash = await sendETH(
        { amount, target: order.addr, gas },
        ethClient,
        sign
      );
      const arHash = await sendAR(
        {
          amount: amount / order.rate!,
          target: tx.sender.ar,
          order: tx.id,
          match: order.txID,
        },
        client,
        jwk
      );

      console.log(ethHash, arHash);

      if (tx.token) {
        // TODO(@johnletey): Execute a token match.
      } else {
        await sendConfirmation(
          { amount: `${tx.received + amount / order.rate!} AR`, order: tx.id },
          client,
          jwk
        );
      }
      await sendConfirmation(
        { amount: `${order.received + amount} ${tx.table}`, order: order.txID },
        client,
        jwk
      );

      //       DONE
      return;
    }
    if (amount < order.amnt * order.rate!) {
      //     if gETH < order

      //       Subtract gETH amount from order (AKA increment matched amount)
      await db.run(
        `UPDATE "${tx.table}" SET amnt = ?, received = ? WHERE txID = ?`,
        [order.amnt - amount / order.rate!, order.received + amount, order.txID]
      );

      //       Send ETH/AR in corresponding locations & confirmation transactions
      const ethHash = await sendETH(
        { amount, target: order.addr, gas },
        ethClient,
        sign
      );
      const arHash = await sendAR(
        {
          amount: amount / order.rate!,
          target: tx.sender.ar,
          order: tx.id,
          match: order.txID,
        },
        client,
        jwk
      );

      console.log(ethHash, arHash);

      if (tx.token) {
        // TODO(@johnletey): Execute a token match.
      } else {
        await sendConfirmation(
          { amount: `${tx.received + amount / order.rate!} AR`, order: tx.id },
          client,
          jwk
        );
      }

      //       DONE
      return;
    }
    if (amount > order.amnt * order.rate!) {
      //     if gETH > order

      //       Remove order from DB
      await db.run(`DELETE FROM "${tx.table}" WHERE txID = ?`, [order.txID]);

      //       Send ETH/AR in corresponding locations & confirmation transactions
      const ethHash = await sendETH(
        { amount: order.amnt * order.rate!, target: order.addr, gas },
        ethClient,
        sign
      );
      const arHash = await sendAR(
        {
          amount: order.amnt,
          target: tx.sender.ar,
          order: tx.id,
          match: order.txID,
        },
        client,
        jwk
      );

      console.log(ethHash, arHash);

      await sendConfirmation(
        {
          amount: `${order.received + order.amnt * order.rate!} ${tx.table}`,
          order: order.txID,
        },
        client,
        jwk
      );

      //       Call function again with updated gETH amount
      await ethSwap(
        {
          ...tx,
          amnt: tx.amnt - order.amnt * order.rate! - gas * gasPrice,
          received: tx.received + order.amnt,
        },
        db,
        client,
        jwk,
        ethClient,
        sign
      );
    }
  }
}
