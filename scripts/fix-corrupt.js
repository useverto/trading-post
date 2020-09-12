//

const fetch = require("node-fetch");

async function request(graphql) {
  var requestOptions = {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: graphql,
  };
  let res = await fetch("https://arweave.dev/graphql", requestOptions);
  return await res.clone().json();
}

async function query({ query, variables }) {
  var graphql = JSON.stringify({
    query,
    variables,
  });
  return await request(graphql);
}

//

const maxInt = 2147483647;

//

async function fixCorrupt(addr) {
  const _txIDs = (
    await query({
      query: `
      query ($tradingPost: String!) {
        transactions (
          owners: [$tradingPost]
          first: ${maxInt}
        ) {
          edges {
            node {
              id
              quantity {
                ar
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
      variables: {
        tradingPost: addr,
      },
    })
  ).data.transactions.edges;

  let txIDs = [];
  for (const tx of _txIDs) {
    if (parseFloat(tx.node.quantity.ar) > 0) {
      // console.log("AR transfer.");
    } else {
      if (tx.node.tags.find((tag) => tag.name === "Type")) {
        // console.log("Confirmation tx.");
      } else {
        txIDs.push({
          id: tx.node.id,
          tag: tx.node.tags.find((tag) => tag.name === "Input").value,
        });
      }
    }
  }

  // TODO(@johnletey): Check if input tag is corrupt.
}

fixCorrupt("WNeEQzI24ZKWslZkQT573JZ8bhatwDVx6XVDrrGbUyk");
