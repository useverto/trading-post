import Log from "@utils/logger";
import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { Database } from "sqlite";

const log = new Log({
  level: Log.Levels.debug,
  name: "swap",
});

export async function swap(
  client: Arweave,
  txID: string,
  jwk: JWKInterface,
  db: Database
) {}
