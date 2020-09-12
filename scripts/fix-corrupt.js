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

const Arweave = require("arweave");

async function fixCorrupt(jwk) {
  const client = Arweave.init({
    host: "arweave.dev",
    port: 443,
    protocol: "https",
  });

  const _txs = (
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
        tradingPost: await client.wallets.jwkToAddress(JSON.parse(jwk)),
      },
    })
  ).data.transactions.edges;

  let txs = [];
  for (const tx of _txs) {
    if (parseFloat(tx.node.quantity.ar) > 0) {
      // AR transfer.
    } else {
      if (
        tx.node.tags.find((tag) => tag.name === "Type") ||
        tx.node.tags.find((tag) => tag.name === "Exchange")
      ) {
        // Confirmation tx or other exchange related tx
      } else {
        const resendTx = (
          await query({
            query: `
            query($tradingPost: String!, $txID: [String!]!) {
              transactions(
                owners: [$tradingPost]
                tags: [
                  { name: "Exchange", values: "Verto" }
                  { name: "Resend", values: $txID }
                ]
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
              tradingPost: await client.wallets.jwkToAddress(JSON.parse(jwk)),
              txID: tx.node.id,
            },
          })
        ).data.transactions.edges;

        if (resendTx.length === 0) {
          const tag = tx.node.tags.find((tag) => tag.name === "Input").value;
          const parsedTag = JSON.parse(tag);
          if (typeof parsedTag === "string") {
            txs.push({
              id: tx.node.id,
              token: tx.node.tags.find((tag) => tag.name === "Contract").value,
              // If you parse the tag again, it will be correct
              input: JSON.parse(parsedTag),
            });
          } else {
            // Not corrupt.
          }
        }
      }
    }
  }

  console.log(`Found ${txs.length} corrupt PST transactions.`);
  if (txs.length > 0) {
    console.log("\n***");
  }

  for (const tx of txs) {
    console.log(`\nResending ${tx.id} ...`);
    const tags = {
      Exchange: "Verto",
      Resend: tx.id,
      "App-Name": "SmartWeaveAction",
      "App-Version": "0.3.0",
      Contract: tx.token,
      Input: JSON.stringify(tx.input),
    };

    const resendTx = await client.createTransaction(
      {
        data: Math.random().toString().slice(-4),
      },
      JSON.parse(jwk)
    );
    for (const [key, value] of Object.entries(tags)) {
      resendTx.addTag(key, value);
    }

    await client.transactions.sign(resendTx, JSON.parse(jwk));
    await client.transactions.post(resendTx);
    console.log(`Sent: ${resendTx.id}`);
  }
}

fixCorrupt(/* pass in your keyfile */);
