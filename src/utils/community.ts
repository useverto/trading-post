import Arweave from "arweave";
import Community from "community-js";
import CONSTANTS from "./constants.yml";

export async function init(client: Arweave) {
  // Initialise a new CommunityXYZ instance
  const community = new Community(client);
  // Connect to the Verto's community
  await community.setCommunityTx(CONSTANTS.exchangeContractSrc);
  // Return
  return community;
}
