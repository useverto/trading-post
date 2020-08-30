import Log from "@utils/logger";
import Arweave from "arweave";

const log = new Log({
  level: Log.Levels.debug,
  name: "match",
});

export async function match(client: Arweave, txId: string) {
  log.info(`Received transaction.\n\t\ttxId=${txId}`);
}
