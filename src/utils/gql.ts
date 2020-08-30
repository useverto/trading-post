// Client for the Arweave GraphQL endpoint
import fetch from "node-fetch";

interface StringMap {
  [key: string]: string | object | number;
}

/**
 * Represents a graphql query
 */
interface GrapqlQuery {
  /**
   * The graphql query as a string
   */
  query: string;
  /**
   * The graphql variables in the given query.
   */
  variables?: string | StringMap;
}

/**
 * Perform a HTTP request to the graphql server.
 * @param graphql The response body as string
 */
async function request(graphql: string) {
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

/**
 * Execute a graphql query with variables.
 * @param param0 A graphql query and its vaiables.
 */
export async function query({ query, variables }: GrapqlQuery) {
  var graphql = JSON.stringify({
    query,
    variables,
  });
  return await request(graphql);
}

/**
 * Execute a simple graphql query without variables.
 * @param query The graphql query to be executed.
 */
export async function simpleQuery(query: string) {
  var graphql = JSON.stringify({
    query,
    variables: {},
  });
  return await request(graphql);
}
