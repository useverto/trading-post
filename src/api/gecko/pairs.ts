import { GQLEdgeInterface } from "types";
import { query } from "@utils/gql";
import Arweave from "arweave";

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
            tags: [
              { name: "Exchange", values: "Verto" }
              { name: "Type", values: ["Buy", "Sell"] }
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

export async function getPairs() {
  const client = new Arweave({
    host: "arweave.net",
    port: 443,
    protocol: "https",
  });

  const tokens: {
    ticker_id: string;
    base: string;
    target: string;
  }[] = [];
  const res = await getAll();
  for (const entry of res) {
    const type = entry.node.tags.find((tag) => tag.name === "Type")?.value;
    const token = entry.node.tags.find(
      (tag) => tag.name === (type === "Buy" ? "Token" : "Contract")
    )?.value!;

    if (tokens.find((entry) => entry.ticker_id === token)) continue;

    const buf = await client.transactions.getData(token, {
      decode: true,
      string: true,
    });
    const contract = JSON.parse(buf.toString());

    tokens.push({
      ticker_id: token,
      base: "AR",
      target: contract.ticker,
    });
  }

  return tokens;
}
