import Log from "@utils/logger";
import Arweave from "arweave";
import Transaction from "arweave/node/lib/transaction";
import Web3 from "web3";
import { JWKInterface } from "arweave/node/lib/wallet";
import { Database } from "sqlite";
import {
  OrderInstance,
  saveOrder,
  getBuyOrders,
  getSellOrders,
} from "@utils/database";
import { getChainAddr } from "@utils/arweave";
import { match } from "./match";

const log = new Log({
  level: Log.Levels.debug,
  name: "swap",
});

async function sendConfirmation(
  client: Arweave,
  txID: string,
  received: string,
  jwk: JWKInterface
) {
  const confirmationTx = await client.createTransaction(
    {
      data: Math.random().toString().slice(-4),
    },
    jwk
  );

  confirmationTx.addTag("Exchange", "Verto");
  confirmationTx.addTag("Type", "Confirmation");
  confirmationTx.addTag("Swap", txID);
  confirmationTx.addTag("Received", received);

  await client.transactions.sign(confirmationTx, jwk);
  await client.transactions.post(confirmationTx);
}

function roundEth(eth: number): string {
  const str = eth.toString();
  const amntBeforeDecimal = str.split(".")[0].length;
  return parseFloat(str)
    .toFixed(18 - amntBeforeDecimal)
    .toString();
}

export async function ethSwap(
  client: Arweave,
  ethClient: Web3,
  tx: {
    id: string;
    sender: string;
    table: string;
    token?: string;
    arAmnt?: number;
    amnt?: number;
    rate?: number;
  },
  jwk: JWKInterface,
  // TODO(@johnletey): Look into the type
  sign: any,
  db: Database,
  save: boolean = true
) {
  let type = tx.arAmnt ? "Buy" : "Sell";

  let amnt = type === "Buy" ? tx.arAmnt! : tx.amnt!;
  let rate = tx.rate;

  let addr =
    type === "Buy" ? (await getChainAddr(tx.sender, tx.table))! : tx.sender;

  let received = 0;

  let chain = tx.table;

  log.info(
    `Received swap.\n\t\ttxID = ${tx.id}\n\t\tchain = ${chain}\n\t\ttype = ${type}`
  );

  if (type === "Sell" && (await getBuyOrders(db, chain)).length === 0) {
    let returnTx;

    returnTx = await client.createTransaction(
      {
        target: tx.sender,
        quantity: client.ar.arToWinston(amnt.toString()),
      },
      jwk
    );

    const fee = parseFloat(
      client.ar.winstonToAr(
        await client.transactions.getPrice(
          parseFloat(returnTx.data_size),
          returnTx.target
        )
      )
    );

    returnTx = await client.createTransaction(
      {
        target: tx.sender,
        quantity: client.ar.arToWinston((amnt - fee).toString()),
      },
      jwk
    );

    returnTx.addTag("Exchange", "Verto");
    returnTx.addTag("Type", "Swap-Return");
    returnTx.addTag("Order", tx.id);
    await client.transactions.sign(returnTx, jwk);
    await client.transactions.post(returnTx);

    log.info(
      `Returned swap order.\n\t\torder = ${tx.id}\n\t\ttxID = ${returnTx.id}`
    );
    return;
  }

  if (save) {
    const swapEntry: OrderInstance = {
      txID: tx.id,
      amnt,
      rate,
      addr,
      // @ts-ignore
      type,
      token: tx.token,
      createdAt: new Date(),
      received,
    };
    await saveOrder(db, chain, swapEntry);
  }

  if (type === "Buy") {
    const orders = await getSellOrders(db, chain);
    for (const order of orders) {
      const ethAmount = amnt * rate!;
      if (order.amnt >= ethAmount) {
        let arTx: Transaction;
        if (!order.token) {
          arTx = await client.createTransaction(
            {
              target: order.addr,
              quantity: client.ar.arToWinston(amnt.toString()),
            },
            jwk
          );
          arTx.addTag("Exchange", "Verto");
          arTx.addTag("Type", "AR-Transfer");
          arTx.addTag("Order", order.txID);
          arTx.addTag("Match", tx.id);
          await client.transactions.sign(arTx, jwk);
          await client.transactions.post(arTx);
        }

        const gasPrice = parseFloat(
          ethClient.utils.fromWei(await ethClient.eth.getGasPrice(), "ether")
        );
        const gas = await ethClient.eth.estimateGas({
          to: addr,
          value: ethClient.utils.toWei(roundEth(ethAmount), "ether"),
        });
        const ethTx = await sign({
          to: addr,
          value: ethClient.utils.toWei(
            roundEth(ethAmount - gas * gasPrice),
            "ether"
          ),
          gas,
        });
        const ethTxID = (
          await ethClient.eth.sendSignedTransaction(ethTx.rawTransaction!)
        ).transactionHash;

        let arString = "";
        if (!order.token) {
          arString =
            `\n\t\tSent ${amnt} AR to ${order.addr}` +
            // @ts-ignore
            `\n\t\ttxID = ${arTx.id}` +
            "\n";
        }
        log.info(
          "Matched!" +
            arString +
            `\n\t\tSent ${roundEth(
              ethAmount - gas * gasPrice
            )} ${chain} to ${addr}` +
            `\n\t\ttxID = ${ethTxID}`
        );

        if (order.amnt === ethAmount) {
          await db.run(`DELETE FROM "${chain}" WHERE txID = ?`, [order.txID]);
          if (order.token) {
            await match(
              client,
              {
                id: order.txID,
                sender: order.addr,
                type: "Buy",
                table: order.token,
                arAmnt: order.received + amnt,
              },
              jwk,
              db
            );
          } else {
            await sendConfirmation(
              client,
              order.txID,
              `${order.received + amnt} AR`,
              jwk
            );
          }
        } else {
          await db.run(
            `UPDATE "${chain}" SET amnt = ?, received = ? WHERE txID = ?`,
            [order.amnt - ethAmount, order.received + amnt, order.txID]
          );
        }
        await db.run(`DELETE FROM "${chain}" WHERE txID = ?`, [tx.id]);
        await sendConfirmation(
          client,
          tx.id,
          `${received + roundEth(ethAmount - gas * gasPrice)} ${chain}`,
          jwk
        );

        return;
      } else {
        let arTx: Transaction;
        if (!order.token) {
          arTx = await client.createTransaction(
            {
              target: order.addr,
              quantity: client.ar.arToWinston((order.amnt / rate!).toString()),
            },
            jwk
          );
          arTx.addTag("Exchange", "Verto");
          arTx.addTag("Type", "AR-Transfer");
          arTx.addTag("Order", order.txID);
          arTx.addTag("Match", tx.id);
          await client.transactions.sign(arTx, jwk);
          await client.transactions.post(arTx);
        }

        const gasPrice = parseFloat(
          ethClient.utils.fromWei(await ethClient.eth.getGasPrice(), "ether")
        );
        const gas = await ethClient.eth.estimateGas({
          to: addr,
          value: ethClient.utils.toWei(roundEth(order.amnt), "ether"),
        });
        const ethTx = await sign({
          to: addr,
          value: ethClient.utils.toWei(
            roundEth(order.amnt - gas * gasPrice),
            "ether"
          ),
          gas,
        });
        const ethTxID = (
          await ethClient.eth.sendSignedTransaction(ethTx.rawTransaction!)
        ).transactionHash;

        let arString = "";
        if (!order.token) {
          arString =
            `\n\t\tSent ${order.amnt / rate!} AR to ${order.addr}` +
            // @ts-ignore
            `\n\t\ttxID = ${arTx.id}` +
            "\n";
        }
        log.info(
          "Matched!" +
            arString +
            `\n\t\tSent ${roundEth(
              order.amnt - gas * gasPrice
            )} ${chain} to ${addr}` +
            `\n\t\ttxID = ${ethTxID}`
        );

        await db.run(
          `UPDATE "${chain}" SET amnt = ?, received = ? WHERE txID = ?`,
          [amnt - order.amnt / rate!, received + order.amnt, tx.id]
        );
        amnt -= order.amnt / rate!;
        received += order.amnt;

        await db.run(`DELETE FROM "${chain}" WHERE txID = ?`, [order.txID]);
        if (order.token) {
          await match(
            client,
            {
              id: order.txID,
              sender: order.addr,
              type: "Buy",
              table: order.token,
              arAmnt: order.received + order.amnt / rate!,
            },
            jwk,
            db
          );
        } else {
          await sendConfirmation(
            client,
            order.txID,
            `${order.received + order.amnt / rate!} AR`,
            jwk
          );
        }
      }
    }
  } else {
    const orders = await getBuyOrders(db, chain);
    for (const order of orders) {
      if (!order.rate) continue;

      const original = amnt;

      const gasPrice = parseFloat(
        ethClient.utils.fromWei(await ethClient.eth.getGasPrice(), "ether")
      );
      let gas = await ethClient.eth.estimateGas({
        to: order.addr,
        value: ethClient.utils.toWei(roundEth(amnt), "ether"),
      });

      amnt = parseFloat(roundEth(amnt - gas * gasPrice));

      if (order.amnt >= amnt / order.rate) {
        let arTx: Transaction;
        if (!tx.token) {
          arTx = await client.createTransaction(
            {
              target: addr,
              quantity: client.ar.arToWinston((amnt / order.rate).toString()),
            },
            jwk
          );
          arTx.addTag("Exchange", "Verto");
          arTx.addTag("Type", "AR-Transfer");
          arTx.addTag("Order", tx.id);
          arTx.addTag("Match", order.txID);
          await client.transactions.sign(arTx, jwk);
          await client.transactions.post(arTx);
        }

        const ethTx = await sign({
          to: order.addr,
          value: ethClient.utils.toWei(roundEth(amnt), "ether"),
          gas,
        });
        const ethTxID = (
          await ethClient.eth.sendSignedTransaction(ethTx.rawTransaction!)
        ).transactionHash;

        let arString = "";
        if (!tx.token) {
          arString =
            `\n\t\tSent ${amnt / order.rate} AR to ${addr}` +
            // @ts-ignore
            `\n\t\ttxID = ${arTx.id}` +
            "\n";
        }
        log.info(
          "Matched!" +
            arString +
            `\n\t\tSent ${roundEth(amnt)} ${chain} to ${order.addr}` +
            `\n\t\ttxID = ${ethTxID}`
        );

        if (order.amnt === amnt / order.rate) {
          await db.run(`DELETE FROM "${chain}" WHERE txID = ?`, [order.txID]);
          await sendConfirmation(
            client,
            order.txID,
            `${order.received + roundEth(amnt)} ${chain}`,
            jwk
          );
        } else {
          await db.run(
            `UPDATE "${chain}" SET amnt = ?, received = ? WHERE txID = ?`,
            [order.amnt - amnt / order.rate, order.received + amnt, order.txID]
          );
        }
        await db.run(`DELETE FROM "${chain}" WHERE txID = ?`, [tx.id]);
        if (tx.token) {
          await match(
            client,
            {
              id: tx.id,
              sender: addr,
              type: "Buy",
              table: tx.token,
              arAmnt: received + amnt / order.rate,
            },
            jwk,
            db
          );
        } else {
          await sendConfirmation(
            client,
            tx.id,
            `${received + amnt / order.rate} AR`,
            jwk
          );
        }

        return;
      } else {
        amnt = original;

        gas = await ethClient.eth.estimateGas({
          to: order.addr,
          value: ethClient.utils.toWei(
            roundEth(order.amnt * order.rate),
            "ether"
          ),
        });

        if (amnt > order.amnt * order.rate + gas * gasPrice) {
          let arTx: Transaction;
          if (!tx.token) {
            arTx = await client.createTransaction(
              {
                target: addr,
                quantity: client.ar.arToWinston(order.amnt.toString()),
              },
              jwk
            );
            arTx.addTag("Exchange", "Verto");
            arTx.addTag("Type", "AR-Transfer");
            arTx.addTag("Order", tx.id);
            arTx.addTag("Match", order.txID);
            await client.transactions.sign(arTx, jwk);
            await client.transactions.post(arTx);
          }

          const ethTx = await sign({
            to: order.addr,
            value: ethClient.utils.toWei(
              roundEth(order.amnt * order.rate),
              "ether"
            ),
            gas,
          });
          const ethTxID = (
            await ethClient.eth.sendSignedTransaction(ethTx.rawTransaction!)
          ).transactionHash;

          let arString = "";
          if (!tx.token) {
            arString =
              `\n\t\tSent ${order.amnt} AR to ${addr}` +
              // @ts-ignore
              `\n\t\ttxID = ${arTx.id}` +
              "\n";
          }
          log.info(
            "Matched!" +
              arString +
              `\n\t\tSent ${roundEth(order.amnt * order.rate)} ${chain} to ${
                order.addr
              }` +
              `\n\t\ttxID = ${ethTxID}`
          );

          await db.run(
            `UPDATE "${chain}" SET amnt = ?, received = ? WHERE txID = ?`,
            [
              amnt - order.amnt * order.rate - gas * gasPrice,
              received + order.amnt,
              tx.id,
            ]
          );
          amnt -= order.amnt * order.rate + gas * gasPrice;
          received += order.amnt;

          await db.run(`DELETE FROM "${chain}" WHERE txID = ?`, [order.txID]);
          await sendConfirmation(
            client,
            order.txID,
            `${order.received + roundEth(order.amnt * order.rate)} ${chain}`,
            jwk
          );
        } else {
          // TODO(@johnletey): We got an issue ...
        }
      }
    }
  }
}
