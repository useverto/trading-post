import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import Web3 from "web3";

const roundETH = (input: number): string => {
  const str = input.toString();
  const amountBeforeDecimal = str.split(".")[0].length;
  return parseFloat(str)
    .toFixed(18 - amountBeforeDecimal)
    .toString();
};

export const sendAR = async (
  input: {
    amount: number;
    target: string;
    order: string;
    match: string;
  },
  client: Arweave,
  jwk: JWKInterface
): Promise<string> => {
  const tx = await client.createTransaction(
    {
      target: input.target,
      quantity: client.ar.arToWinston(input.amount.toString()),
    },
    jwk
  );

  tx.addTag("Exchange", "Verto");
  tx.addTag("Type", "AR-Transfer");
  tx.addTag("Order", input.order);
  tx.addTag("Match", input.match);

  await client.transactions.sign(tx, jwk);
  await client.transactions.post(tx);

  return tx.id;
};

export const sendETH = async (
  input: {
    amount: number;
    target: string;
    gas: number;
  },
  client: Web3,
  sign: any
): Promise<string> => {
  const tx = await sign({
    to: input.target,
    value: client.utils.toWei(roundETH(input.amount), "ether"),
    gas: input.gas,
  });

  const res = await client.eth.sendSignedTransaction(tx.rawTransaction);

  return res.transactionHash;
};

export const sendConfirmation = async (
  input: {
    amount: string;
    order: string;
  },
  client: Arweave,
  jwk: JWKInterface
) => {
  const tx = await client.createTransaction(
    {
      data: Math.random().toString().slice(-4),
    },
    jwk
  );

  tx.addTag("Exchange", "Verto");
  tx.addTag("Type", "Confirmation");
  tx.addTag("Swap", input.order);
  tx.addTag("Received", input.amount);

  await client.transactions.sign(tx, jwk);
  await client.transactions.post(tx);
};
