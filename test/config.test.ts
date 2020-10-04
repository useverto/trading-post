import {
  createConfig,
  TradingPostConfig,
  loadConfig,
  validateConfig,
} from "../src/utils/config";
import { assert, expect, should } from "chai";
import sinon from "sinon";

let testConfiguration: TradingPostConfig;

describe("Config tests", () => {
  it("Assign configuration", (done) => {
    testConfiguration = {
      genesis: {
        blockedTokens: [
          "usjm4PCxUd5mtaon7zc97-dt-3qf67yPyqgzLnLqk5A",
          "FcM-QQpfcD0xTTzr8u4Su9QCgcvRx_JH4JSCQoFi6Ck",
        ],
        tradeFee: 0.01,
        publicURL: "https://example.com/",
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
  it("Read configuration", async () => {
    const config: TradingPostConfig = await loadConfig(
      "./test_artifacts/verto.config.json"
    );
    assert(config, "Failed to assert file configuration");
    expect(config).to.deep.equals(
      testConfiguration,
      "File configuration does not match with default"
    );
    return;
  });
});

describe("Config validation", () => {
  it("Wrap process exit", (done) => {
    sinon.stub(process, "exit");
    done();
  });
  it("Null checks", (done) => {
    let cloneConfig = testConfiguration;
    /**
     * The below ignore directive is used to simulate real-life runtime enviornment
     */
    // @ts-ignore
    cloneConfig.genesis.acceptedTokens.push(null);
    validateConfig(cloneConfig);
    // @ts-ignore
    assert(process.exit.isSinonProxy, "Faking process exit failed");
    // @ts-ignore
    assert(process.exit.called, "process.exit is never called");
    // @ts-ignore
    assert(process.exit.calledWith(1), "process.exit code is not 1");
    done();
  });

  it("Trade fee check", (done) => {
    let cloneConfig = testConfiguration;
    /**
     * The below ignore directive is used to simulate real-life runtime enviornment
     */
    // @ts-ignore
    cloneConfig.genesis.tradeFee = "some_string";
    validateConfig(cloneConfig);
    // @ts-ignore
    assert(process.exit.isSinonProxy, "Faking process exit failed");
    // @ts-ignore
    assert(process.exit.called, "process.exit is never called");
    // @ts-ignore
    assert(process.exit.calledWith(1), "process.exit code is not 1");
    done();
  });
});
