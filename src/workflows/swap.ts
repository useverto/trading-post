import Log from "@utils/logger";
import { Database } from "sqlite";
import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import Web3 from "web3";
import { OrderInstance, saveOrder, getSellOrders } from "@utils/database";

const log = new Log({
  level: Log.Levels.debug,
  name: "swap",
});

async function ethSwap(
  tx: {
    id: string;
    sender: string;
    table: string;
    token?: string;
    arAmnt?: number;
    amnt?: number;
    rate?: number;
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

    const swapEntry: OrderInstance = {
      txID: tx.id,
      amnt: tx.arAmnt,
      rate: tx.rate,
      addr: tx.sender,
      type: "Buy",
      token: tx.table,
      createdAt: new Date(),
      received: 0,
    };
    await saveOrder(db, tx.table, swapEntry);
  }

  if (tx.amnt) {
    // ETH Incoming
    //   Recursive
    let amount = tx.amnt;

    //   Find first order in orderbook
    const orders = await getSellOrders(db, tx.table);
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
    if (amount === order.amnt) {
      //     if gETH === order
      //       Remove order from DB
      await db.run(`DELETE FROM "${tx.table}" WHERE txID = ?`, [order.txID]);
      //       Send ETH/AR in corresponding locations & confirmation transactions
      //       DONE
    }
    if (amount < order.amnt) {
      //     if gETH < order
      //       Subtract gETH amount from order (AKA increment matched amount)
      //       Send ETH/AR in corresponding locations & confirmation transactions
      //       DONE
    }
    if (amount > order.amnt) {
      //     if gETH > order
      //       Remove order from DB
      await db.run(`DELETE FROM "${tx.table}" WHERE txID = ?`, [order.txID]);
      //       Send ETH/AR in corresponding locations & confirmation transactions
      //       Call function again with updated gETH amount
    }
  }
}
