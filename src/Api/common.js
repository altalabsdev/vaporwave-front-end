import { ApolloClient, InMemoryCache } from "@apollo/client";

export const chainlinkClient = createClient("https://api.thegraph.com/subgraphs/name/deividask/chainlink");
export const auroraGraphClient = createClient("https://api.thegraph.com/subgraphs/name/gmx-io/gmx-stats");
export const nissohGraphClient = createClient("https://api.thegraph.com/subgraphs/name/nissoh/gmx-vault");
export const auroraReferralsGraphClient = createClient(
  "https://api.thegraph.com/subgraphs/name/gmx-io/gmx-arbitrum-referrals"
);

function createClient(uri) {
  return new ApolloClient({
    uri,
    cache: new InMemoryCache(),
  });
}
