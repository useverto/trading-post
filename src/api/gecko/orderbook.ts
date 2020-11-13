import { GQLEdgeInterface } from "types";
import { query } from "@utils/gql";
import Arweave from "arweave";
import exchangeWallet from "../../utils/constants.yml";

export const allGenesisTxs = async () => {
  let hasNextPage = true;
  let edges: GQLEdgeInterface[] = [];
  let cursor: string = "";

  while (hasNextPage) {
    const res = (
      await query({
        query: `
        query {
          transactions(
            recipients: [${exchangeWallet}]
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

export const allTradingPostConfigs = async () => {
  const client = new Arweave({
    host: "arweave.net",
    port: 443,
    protocol: "https",
  });
  const res = await allGenesisTxs;
  let allConfigs = [];
  for (const edge of res) {
    const id = edge.node.id;
    const buf = await client.transactions.getData(id, {
      decode: true,
      string: true,
    });
    const config = JSON.parse(buf.toString());
    allConfigs.push({
      txID: id,
      address: edge.node.owner.address,
      endpoint: config.publicURL,
    });
  }
};
