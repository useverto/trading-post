import { GQLEdgeInterface } from "types";
import { query } from "@utils/gql";
import Arweave from "arweave";
import CONSTANTS from "../../utils/constants.yml";
import { OrderInstance } from "@utils/database";
import fetch from "node-fetch";

const getAll = async () => {
  let hasNextPage = true;
  let edges: GQLEdgeInterface[] = [];
  let cursor: string = "";

  while (hasNextPage) {
    const res = (
      await query({
        query: `
        query {
          transactions(
            recipients: ["${CONSTANTS.exchangeWallet}"]
            tags: [
              { name: "Exchange", values: "Verto" }
              { name: "Type", values: "Genesis" }
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
                owner {
                  address
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

const getConfigs = async () => {
  const client = new Arweave({
    host: "arweave.net",
    port: 443,
    protocol: "https",
  });

  const res = await getAll();

  let posts: {
    genesis: string;
    address: string;
    endpoint: string;
  }[] = [];

  for (const edge of res) {
    const id = edge.node.id;

    if (posts.find((element) => element.address === edge.node.owner.address))
      continue;

    const buf = await client.transactions.getData(id, {
      decode: true,
      string: true,
    });
    const config = JSON.parse(buf.toString());

    let endpoint = config.publicURL.startsWith("https://")
      ? config.publicURL
      : "https://" + config.publicURL;
    endpoint = endpoint.endsWith("/") ? endpoint : endpoint + "/";

    posts.push({
      genesis: id,
      address: edge.node.owner.address,
      endpoint,
    });
  }

  return posts;
};

const getOrderBooks = async () => {
  const res = await getConfigs();

  let orderBook: { token: string; orders: OrderInstance[] }[] = [];
  for (const post of res) {
    try {
      let orders: { token: string; orders: OrderInstance[] }[] = await (
        await fetch(`${post.endpoint}orders`)
      )
        .clone()
        .json();
      for (const elem of orders) {
        if (orderBook.find((entry) => entry.token === elem.token)) {
          const index = orderBook.findIndex(
            (entry) => entry.token === elem.token
          );
          orderBook[index].orders.concat(elem.orders);
        } else {
          orderBook.push(elem);
        }
      }
    } catch {
      //
    }
  }

  return orderBook;
};

export const getOrderBook = async (token: string, depth: number) => {
  const res = await getOrderBooks();

  if (res.find((elem) => elem.token === token)) {
    const index = res.findIndex((elem) => elem.token === token);
    const orders = res[index].orders.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    const bids: (number | undefined)[][] = [];
    for (const order of orders
      .filter((elem) => elem.type === "Buy")
      .slice(0, depth / 2)) {
      bids.push([order.rate, order.amnt]);
    }

    const asks: (number | undefined)[][] = [];
    for (const order of orders
      .filter((elem) => elem.type === "Sell")
      .slice(0, depth / 2)) {
      asks.push([order.rate, order.amnt]);
    }

    return {
      ticker_id: token,
      timestamp: orders[0].createdAt,
      bids,
      asks,
    };
  }
};
