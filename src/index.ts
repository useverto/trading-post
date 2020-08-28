import { init } from "@utils/arweave";
import { query } from "@utils/gql";
import Log from "@utils/logger";
import txsQuery from "./queries/txs.gql";

const log = new Log({
  level: Log.Levels.debug,
  name: "verto",
});

log.debug("Starting bootstrap...");

bootstrap().catch((err) => console.log(err));

async function bootstrap() {
  const { client, community } = await init();

  // This logic grabs the latest trade tx
  console.log(
    (
      await query({
        query: txsQuery,
        variables: {
          // @ts-ignore
          num: 1,
        },
      })
    ).data.transactions.edges[0]
  );
}
