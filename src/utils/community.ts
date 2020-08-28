import Arweave from "arweave";
import Community from "community-js";

import { exchangeContractSrc } from "@utils/constants";

export async function init(client: Arweave) {
  // Initialise a new CommunityXYZ instance
  const community = new Community(client);
  // Connect to the Verto's community
  await community.setCommunityTx(exchangeContractSrc);
  // Return
  return community;
}
