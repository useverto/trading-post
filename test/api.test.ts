import {
    initAPI
  } from "../src/api/index";
  import supertest, { SuperTest, Test } from "supertest";
  let server: any;
  let request: SuperTest<Test>;

  describe("API tests", () => {
    it("Start server", (done) => {
        server = initAPI("localhost", 8080).listen();
        request = supertest(server);
        done();
    });
    it("Test server response", (done) => {
        request
        .get('/ping')
        .expect(200)
        .end((err, res) => {
            if(err) return done(err);
            done();
        })
    });
    it("Shutdown server", (done) => {
        server.close();
        done();
    });
  });
  