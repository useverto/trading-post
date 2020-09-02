import Logger from "../src/utils/logger";
import { assert } from "chai";

let log: Logger;

describe("Logger tests", () => {
  it("Create logger instance", (done) => {
    log = new Logger({
      name: "test",
      level: Logger.Levels.debug,
    });
    assert(log);
    done();
  });
  it("Print debug message", (done) => {
    log.debug("This is a debug message");
    done();
  });
  it("Print info message", (done) => {
    log.info("This is a info message");
    done();
  });
  it("Print warning message", (done) => {
    log.warn("This is a warning message");
    done();
  });
  it("Print error message", (done) => {
    log.error("This is a error message");
    done();
  });
});
