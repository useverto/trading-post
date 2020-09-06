import { initAPI } from "../src/api/index";
import supertest, { SuperTest, Test } from "supertest";
let server: any;
let request: SuperTest<Test>;

describe("API tests", () => {
  it("Start server", (done) => {
    server = initAPI(
      {
        genesis: {
          acceptedTokens: [
            "c25-RdheC6khcACLv23-XXg1W7YuA-VSZ_1_qnNFbhw",
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
      },
      undefined,
      false
    ).listen();
    request = supertest(server);
    done();
  });
  it("Test server response", (done) => {
    request
      .get("/ping")
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        done();
      });
  });
  it("Shutdown server", (done) => {
    server.close();
    done();
  });
});
