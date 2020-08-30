import { Sequelize } from "sequelize";
import Logger from "@utils/logger";

const log = new Logger({
  name: "database",
  level: Logger.Levels.debug,
});

/**
 * Establish connection with the sqlite database.
 * @param db sqlite data file location
 */
export async function init(db: string): Promise<Sequelize> {
  const sequelize = new Sequelize({
    dialect: "sqlite",
    storage: db,
    logging: (msg) => log.debug(msg),
  });
  try {
    await sequelize.authenticate();
    log.info("Connection has been established successfully.");
  } catch (error) {
    log.error("Unable to connect to the database: " + error);
  }
  return sequelize;
}
