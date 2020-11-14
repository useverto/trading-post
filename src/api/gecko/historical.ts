import { getConfirmations } from "./tickers";
import { query } from "@utils/gql";

export const getHistorical = async (token: string, depth: number) => {
  const res = await getConfirmations();

  const history: {
    trade_id: string;
    price?: number;
    base_volume: number;
    target_volume: number;
    trade_timestamp: number;
    type: "buy" | "sell";
  }[] = [];
  for (const confirmation of res) {
    const receivedTag = confirmation.node.tags.find(
      (tag) => tag.name === "Received"
    );
    const orderTag = confirmation.node.tags.find((tag) => tag.name === "Match");

    if (orderTag) {
      const tx = (
        await query({
          query: `
          query {
            transaction(id: "${orderTag.value}") {
              id
              quantity {
                ar
              }
              tags {
                name
                value
              }
            }
          }          
        `,
        })
      ).data.transaction;

      const type = tx.tags.find(
        (tag: { name: string; value: string }) => tag.name === "Token"
      )
        ? "buy"
        : "sell";

      if (type === "buy") {
        const tokenTag = tx.tags.find(
          (tag: { name: string; value: string }) => tag.name === "Token"
        );

        if (tokenTag && tokenTag.value === token) {
          history.push({
            trade_id: tx.id,
            base_volume: parseFloat(tx.quantity.ar),
            target_volume: Math.floor(
              parseFloat(receivedTag?.value.split(" ")[0]!)
            ),
            trade_timestamp: confirmation.node.block.timestamp,
            type,
          });
        }
      } else {
        const tokenTag = tx.tags.find(
          (tag: { name: string; value: string }) => tag.name === "Contract"
        );

        if (tokenTag && tokenTag.value === token) {
          history.push({
            trade_id: tx.id,
            base_volume: JSON.parse(
              tx.tags.find(
                (tag: { name: string; value: string }) => tag.name === "Input"
              ).value
            ).qty,
            target_volume: parseFloat(receivedTag?.value.split(" ")[0]!),
            trade_timestamp: confirmation.node.block.timestamp,
            type,
          });
        }
      }
    }
  }

  return {
    buy: history.filter((trade) => trade.type === "buy"),
    sell: history.filter((trade) => trade.type === "sell"),
  };
};
