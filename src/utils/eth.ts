import Logger from "@utils/logger";
import Web3 from "web3";

const log = new Logger({
  level: Logger.Levels.debug,
  name: "eth",
});

export function init() {
  // TODO(@johnletey): Switch to mainnet when done testing
  const client = new Web3(
    new Web3.providers.HttpProvider(
      "https://rinkeby.infura.io/v3/3bf0fb3706b942138503176dc1b1d545"
    )
  );
  // TODO(@johnletey): Read TP's private key
  return { client, privateKey: "" };
}
