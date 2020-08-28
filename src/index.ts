import { init } from "@utils/arweave";
import { query } from "@utils/gql";
import Log from "@utils/logger";
import genesisQuery from "./queries/genesis.gql";
import txsQuery from "./queries/txs.gql";

const log = new Log({
  level: Log.Levels.debug,
  name: "verto",
});

log.debug("Starting bootstrap...");

bootstrap().catch((err) => console.log(err));

async function bootstrap() {
  const { client, community } = await init();

  const possibleGenesis = (
    await query({
      query: genesisQuery,
      variables: {
        // @ts-ignore
        owners: ["l-x7026roC1dkAmJ5iWhz4vGOxVnKmotGbceFAA-NwE"],
        // @ts-ignore
        reciepents: ["pvPWBZ8A5HLpGSEfhEmK1A3PfMgB_an8vVS6L14Hsls"],
      },
    })
  ).data.transactions.edges;
  if (possibleGenesis.length === 1) {
    log.info(`Genesis tx found: ${possibleGenesis[0].node.id}`);
  } else {
    log.info("No genesis found!");
  }

  // This logic grabs the latest trade tx
  // console.log(
  //   (
  //     await query({
  //       query: txsQuery,
  //       variables: {
  //         // @ts-ignore
  //         num: 1,
  //       },
  //     })
  //   ).data.transactions.edges[0]
  // );
}
