import Log from "@utils/logger";
import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { Database } from "sqlite";

const log = new Log({
  level: Log.Levels.debug,
  name: "cancel",
});

export async function cancel(
  client: Arweave,
  order: string,
  jwk: JWKInterface,
  db: Database
) {
  return;
}
