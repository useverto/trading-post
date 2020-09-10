import OrdersCommand from "../src/commands/orders";

describe("Test `verto orders`", () => {
    it("Retrieve order book", async () => {
        return await OrdersCommand({
            config: "verto.config.example.json",
        })
    });
});
