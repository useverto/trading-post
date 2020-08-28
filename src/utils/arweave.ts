import Arweave from "arweave";
import { JWKPublicInterface } from "arweave/node/lib/wallet";
import Logger from "@utils/logger";
import { join, relative } from "path";
import { readFile } from "fs/promises";

const relativeKeyPath = process.env.KEY_PATH
  ? relative(__dirname, process.env.KEY_PATH)
  : "../../arweave.json";

const log = new Logger({
  name: "arweave.ts",
  level: Logger.Levels.debug,
});

export async function init() {
  const client = new Arweave({
    host: "arweave.net",
    port: 443,
    protocol: "https",
    timeout: 20000,
    logging: true,
    logger: (msg: any) => log.debug(msg),
  });
  const jwk = await getJwk();
  const walletAddr = await client.wallets.jwkToAddress(jwk!);
  const info = await client.network.getInfo();
  log.info(
    "Created Arweave instance:\n\t\t      " +
      `wallet_address=${walletAddr}\n\t\t      ` +
      `block_height=${info.height}\n\t\t      ` +
      `peers=${info.peers}\n\t\t      ` +
      `node_state_latency=${info.node_state_latency}`
  );

  return client;
}

let cachedJwk: JWKPublicInterface | undefined;
async function getJwk() {
  if (!cachedJwk) {
    const potentialJwk = JSON.parse(
      await readFile(join(__dirname, relativeKeyPath), { encoding: "utf8" })
    );
    cachedJwk = potentialJwk;
  }
  return cachedJwk;
}
