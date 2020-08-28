import { query } from "@utils/gql";
import Log from "@utils/logger";
import bootstrapQuery from "./queries/bootstrap.gql";

const log = new Log({
  level: Log.Levels.debug,
  name: "index.ts",
});

log.debug("Starting bootstrap...");

bootstrap().catch((err) => console.log(err));

async function bootstrap() {
  console.log(
    await query({
      query: bootstrapQuery,
    })
  );
}
