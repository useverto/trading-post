import "@utils/console";
import commander from "commander";
import { init } from "@utils/arweave";
import { query } from "@utils/gql";
import Log from "@utils/logger";
import genesisQuery from "./queries/genesis.gql";
import txsQuery from "./queries/txs.gql";
import CONSTANTS from "./utils/constants.yml";
import { genesis } from "workflows/genesis";

const log = new Log({
  level: Log.Levels.debug,
  name: "verto",
});

async function bootstrap(keyfile?: string) {
  const { client, walletAddr, community } = await init(keyfile);

  await genesis(client, walletAddr, community);

  // const possibleGenesis = (
  //   await query({
  //     query: genesisQuery,
  //     variables: {
  //       owners: [walletAddr],
  //       reciepents: [CONSTANTS.exchangeWallet],
  //     },
  //   })
  // ).data.transactions.edges;
  // if (possibleGenesis.length === 1) {
  //   log.info(`Genesis tx found: ${possibleGenesis[0].node.id}`);
  // } else {
  //   log.info("No genesis found!");
  // }

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

const program = commander.program;
const verto = new commander.Command();

program.option("-k, --key-file <file>", "Arweave wallet keyfile");

program.parse(process.argv);

if (program.keyFile) {
  bootstrap(program.keyFile).catch((err) => log.error(err));
}
