import { init } from "../src/utils/database";

describe("Database tests", () => {
  it("Init database", async () => {
    return await init("./test_artifacts/db.db");
  });
});
