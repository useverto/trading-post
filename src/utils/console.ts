import Logger from "@utils/logger";
const log = new Logger({
  name: "community-js",
  level: Logger.Levels.warn,
});

/** TEMPORARY FILE
 * Disables Smartweave's console.log and console.warn in the code.
 * See https://github.com/ArweaveTeam/SmartWeave/pull/27
 */

// @ts-ignore
console.newLog = (x: any) => console.info(x);
console.log = (x: any) => log.debug(x);
console.warn = (x: any) => log.warn(x);
