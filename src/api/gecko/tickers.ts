import { GQLEdgeInterface } from "types";
import moment from "moment";
import { query } from "@utils/gql";
import { getAll } from "./pairs";
import Arweave from "arweave";

/**
 * Returns the volumes of all tokens being traded
 */
const getVolume = async (
  res: GQLEdgeInterface[],
  ticker: string,
  type: string
) => {
  let high = moment();
  let low = high.clone().subtract(1, "days");

  let trades = res.filter(
    (entry) =>
      entry.node.tags.find(
        (tag) =>
          tag.name ===
          (entry.node.tags.find((tag) => tag.name === "Type")?.value! === "Buy"
            ? "Token"
            : "Contract")
      )?.value === ticker
  );
  trades = trades.filter(
    (entry) =>
      entry.node.tags.find((tag) => tag.name === "Type")?.value! === type
  );
  trades = trades.filter(
    (entry) =>
      entry.node.block.timestamp <= high.unix() &&
      entry.node.block.timestamp >= low.unix()
  );

  let sum = 0;

  for (const entry of trades) {
    const type = entry.node.tags.find((tag) => tag.name === "Type")?.value;

    if (type === "Buy") {
      sum += parseFloat(entry.node.quantity.ar);
    }
    if (type === "Sell") {
      const input = entry.node.tags.find((tag) => tag.name === "Input")?.value!;
      sum += JSON.parse(input).qty;
    }
  }

  return sum;
};

export const getConfirmations = async () => {
  let hasNextPage = true;
  let edges: GQLEdgeInterface[] = [];
  let cursor: string = "";

  while (hasNextPage) {
    const res = (
      await query({
        query: `
        query {
          transactions(
            tags: [
              { name: "Exchange", values: "Verto" }
              { name: "Type", values: "Confirmation" }
            ]
            after: "${cursor}"
          ) {
            pageInfo {
              hasNextPage
            }
            edges {
              cursor
              node {
                id
                block {
                  timestamp
                }
                tags {
                  name
                  value
                }
              }
            }
          }
        }
      `,
      })
    ).data.transactions;

    if (res.edges && res.edges.length) {
      edges = edges.concat(res.edges);
      cursor = res.edges[res.edges.length - 1].cursor;
    }
    hasNextPage = res.pageInfo.hasNextPage;
  }

  return edges;
};

const fillArray = (arr: number[]): number[] => {
  const index = arr.findIndex((entry) => isNaN(entry));
  if (index === -1) {
    return arr;
  }

  let i = index;

  while (i < arr.length) {
    if (isNaN(arr[i])) {
      i++;
    } else {
      break;
    }
  }

  for (let j = index; j < i; j++) {
    if (index === 0) {
      arr[j] = arr[i];
    } else {
      arr[j] = arr[index - 1];
    }
  }

  return fillArray(arr);
};

const getPrices = async (ticker: string) => {
  const res = await getConfirmations();
  const orders: {
    rate: number;
    timestamp: number;
  }[] = [];

  for (const edge of res) {
    const receivedTag = edge.node.tags.find((tag) => tag.name === "Received");

    if (receivedTag && receivedTag.value.split(" ")[1] === "AR") {
      const orderTag = edge.node.tags.find((tag) => tag.name === "Match");

      if (orderTag) {
        const tx = (
          await query({
            query: `
            query {
              transaction(id: "${orderTag.value}") {
                tags {
                  name
                  value
                }
              }
            }          
          `,
          })
        ).data.transaction;

        if (
          tx.tags.find(
            (tag: { name: string; value: string }) => tag.name === "Contract"
          ).value === ticker
        ) {
          const rate = tx.tags.find(
            (tag: { name: string; value: string }) => tag.name === "Rate"
          ).value;
          if (rate) {
            orders.push({
              rate: 1 / parseFloat(rate),
              timestamp: edge.node.block
                ? edge.node.block.timestamp
                : parseInt(new Date().getTime().toString().slice(0, -3)),
            });
          }
        }
      }
    }
  }

  let prices: number[] = [];
  if (orders.length > 0) {
    let high = moment();

    while (high.unix() >= orders[orders.length - 1].timestamp) {
      const low = high.clone().subtract(1, "days");

      const day: number[] = orders
        .filter(
          (order) =>
            order.timestamp <= high.unix() && order.timestamp >= low.unix()
        )
        .map((order) => order.rate);

      prices.push(day.reduce((a, b) => a + b, 0) / day.length);

      high = low;
    }

    if (!prices.every((price) => isNaN(price))) {
      prices = fillArray(prices.reverse());
    }
  }

  return prices;
};

/**
 * Tickers with detailed information
 */
export async function getTickers() {
  const client = new Arweave({
    host: "arweave.net",
    port: 443,
    protocol: "https",
  });

  const tickers: {
    ticker_id: string;
    base_currency: string;
    target_currency: string;
    last_price: number;
    base_volume: number;
    target_volume: number;
    bid?: number;
    ask: number;
    high: number;
    low: number;
  }[] = [];
  const res = await getAll();

  for (const edge of res) {
    const type = edge.node.tags.find((tag) => tag.name === "Type")?.value;
    const token = edge.node.tags.find(
      (tag) => tag.name === (type === "Buy" ? "Token" : "Contract")
    )?.value!;

    if (tickers.find((edge) => edge.ticker_id === token)) continue;

    const buf = await client.transactions.getData(token, {
      decode: true,
      string: true,
    });
    const contract = JSON.parse(buf.toString());

    const prices = await getPrices(token);
    console.log(prices);
    console.log(Math.min(...prices));

    tickers.push({
      ticker_id: token,
      base_currency: "AR",
      target_currency: contract.ticker,
      last_price: prices[prices.length - 1],
      base_volume: await getVolume(res, token, "Buy"),
      target_volume: await getVolume(res, token, "Sell"),
      // bid: 0,
      ask: Math.min(...prices),
      high: 0,
      low: 0,
    });
  }

  return tickers;
}
