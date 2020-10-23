import * as fs from "fs";
import { relative } from "path";
import Logger from "@utils/logger";
import Web3 from "web3";

const { readFile } = fs.promises;

const relativeKeyPath = process.env.KEY_PATH
  ? relative(__dirname, process.env.KEY_PATH)
  : "./privatekey";

const log = new Logger({
  level: Logger.Levels.debug,
  name: "eth",
});

export async function init(keyfile?: string) {
  log.info(`Loading private key from: ${keyfile || relativeKeyPath}`);
  const privateKey = (await readFile(keyfile || relativeKeyPath)).toString();

  // TODO(@johnletey): Switch to mainnet when done testing
  const client = new Web3(
    new Web3.providers.HttpProvider(
      "https://rinkeby.infura.io/v3/3bf0fb3706b942138503176dc1b1d545"
    )
  );

  const account = client.eth.accounts.privateKeyToAccount(privateKey);
  const balance = client.utils.fromWei(
    await client.eth.getBalance(account.address),
    "ether"
  );

  log.info(
    "Created Web3 instance:\n\t\t" +
      `addr    = ${account.address}\n\t\t` +
      `balance = ${parseFloat(balance).toFixed(3)} ETH`
  );

  return { client, sign: account.signTransaction };
}
