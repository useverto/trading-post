import "module-alias/register";
import { query } from "@utils/gql";

bootstrap().catch((err) => console.log(err));

async function bootstrap() {
  console.log(
    await query({
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
}
