import Arweave from "arweave";
import { JWKPublicInterface } from "arweave/node/lib/wallet";
import Logger from "@utils/logger";
import { relative } from "path";
import { readFile } from "fs/promises";
import Community from "community-js";
import CONSTANTS from "./constants.yml";

const relativeKeyPath = process.env.KEY_PATH
  ? relative(__dirname, process.env.KEY_PATH)
  : "./arweave.json";

const log = new Logger({
  level: Logger.Levels.debug,
  name: "arweave",
});

export async function init(keyfile?: string) {
  const client = new Arweave({
    host: "arweave.dev",
    port: 443,
    protocol: "https",
    timeout: 20000,
    logging: false,
    logger: (msg: any) => log.debug(msg),
  });
  const jwk = await getJwk(keyfile);
  const walletAddr = await client.wallets.jwkToAddress(jwk!);
  const info = await client.network.getInfo();
  log.info(
    "Created Arweave instance:\n\t\t" +
      `wallet_address=${walletAddr}\n\t\t` +
      `block_height=${info.height}\n\t\t` +
      `peers=${info.peers}\n\t\t` +
      `node_state_latency=${info.node_state_latency}`
  );

  log.info("Configuring community.xyz");
  const community = new Community(client, jwk);
  log.debug(
    `Setting community tx. community_tx=${CONSTANTS.exchangeContractSrc}`
  );
  await community.setCommunityTx(CONSTANTS.exchangeContractSrc);

  return { client, walletAddr, community, jwk };
}

let cachedJwk: JWKPublicInterface | undefined;
export async function getJwk(keyfile?: string) {
  if (!cachedJwk) {
    log.info(`Loading keyfile from: ${keyfile || relativeKeyPath}`);
    const potentialJwk = JSON.parse(
      await readFile(keyfile || relativeKeyPath, { encoding: "utf8" })
    );
    cachedJwk = potentialJwk;
  }
  return cachedJwk;
}
