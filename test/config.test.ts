import { createConfig, TradingPostConfig } from "../src/utils/config";
import { assert } from "chai";

let testConfiguration: TradingPostConfig;

describe("Config tests", () => {
  it("Assing configuration", (done) => {
    testConfiguration = {
      genesis: {
        acceptedTokens: [
          "c25-RdheC6khcACLv23-XXg1W7YuA-VSZ_1_qnNFbhw",
          "FcM-QQpfcD0xTTzr8u4Su9QCgcvRx_JH4JSCQoFi6Ck",
        ],
        tradeFee: "0.01",
        publicURL: new URL("https://example.com/"),
        version: "0.2.0",
      },
      database: "./db.db",
      api: {
        port: 8080,
        host: "localhost",
      },
    };
    assert(testConfiguration);
    done();
  });
  it("Generate configuration", async () => {
    return await createConfig(
      "./test_artifacts/verto.config.json",
      testConfiguration
    );
  });
});
