import "module-alias/register";
import { query } from "@utils/gql";

console.log(
  query({
    query: `
    query {
      transactions(tags: [{ name: "Exchange", values: "Verto" }]) {
        edges {
          node {
            id
          }
        }
      }
    }
  `,
  })
);
