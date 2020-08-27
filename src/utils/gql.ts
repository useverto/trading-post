// Client for the Arweave GraphQL endpoint
import fetch from "node-fetch";

export async function query({
  query,
  variables,
}: {
  query: string;
  variables?: string;
}) {
  var graphql = JSON.stringify({
    query,
    variables,
  });
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
