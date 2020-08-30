import Log from "@utils/logger";
import Arweave from "arweave";
import { simpleQuery } from "@utils/gql";

const log = new Log({
  level: Log.Levels.debug,
  name: "match",
});

export async function match(client: Arweave, txId: string) {
  const tx = (
    await simpleQuery(`
      query {
        transaction(id: "${txId}") {
          id
          tags {
            name
            value
          }
        }
      }
    `)
  ).data.transaction;

  // @ts-ignore
  const opcode = tx.tags.find((tag) => tag.name === "Trade-Opcode")?.value!;

  log.info(`Received transaction.\n\t\ttxId = ${txId}\n\t\topCode = ${opcode}`);
}
