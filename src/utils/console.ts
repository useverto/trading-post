import Logger from "@utils/logger";
const log = new Logger({
  name: "community-js",
  level: Logger.Levels.debug,
});

/**
 * Converts console to logger except the console.log method
 */

console.info = (x: any) => log.info(x);
console.warn = (x: any) => log.warn(x);
console.error = (x: any) => log.error(x);
