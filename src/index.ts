import "module-alias/register";
import { query } from "@utils/gql";
import Log from '@utils/logger';

const log = new Log({
  level: Log.Levels.debug,
  name: 'index.ts'
});

log.debug("Starting bootstrap...")

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
