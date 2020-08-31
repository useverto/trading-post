import { init } from "../src/utils/database";
import { mkdirSync } from "fs";

mkdirSync("./test_artifacts/", { recursive: true });

describe("Database tests", () => {
  it("Init database", async () => {
    return await init("./test_artifacts/db.db");
  });
});
