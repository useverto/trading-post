import { Sequelize, Model, DataTypes, ModelCtor } from "sequelize";
import Logger from "@utils/logger";

const log = new Logger({
  name: "database",
  level: Logger.Levels.debug,
});

// We need to declare an interface for our model that is basically what our class would be
export interface TokenInstance extends Model {
  id: number;
  amnt: number;
  price?: number;
  createdAt: Date;
  addr: string;
}

export interface TokenModel {
  model: ModelCtor<TokenInstance>;
  contract: string;
}

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

/**
 * Setup database tables for tokens
 * @param sequelize sqlite3 connection pool
 * @param contracts the contract IDs
 */
export function setupTokenTables(
  sequelize: Sequelize,
  contracts: string[]
): TokenModel[] {
  let contractTables: TokenModel[] = contracts.map((contract, i) => {
    let model = sequelize.define<TokenInstance>(contract, {
      id: {
        primaryKey: true,
        type: DataTypes.INTEGER.UNSIGNED,
      },
      amnt: {
        type: DataTypes.NUMBER,
      },
      price: {
        type: DataTypes.NUMBER || DataTypes,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
      },
      addr: {
        type: DataTypes.STRING,
      },
    });
    return { model, contract };
  });
  return contractTables;
}

/**
 * Get the database model for a particular contract ID from an array of db models.
 * @param models An array of token models.
 * @param contractID The contract ID for the particular model.
 */
export function contractModel(
  models: TokenModel[],
  contractID: string
): TokenModel | undefined {
  const contractModel = models.find((model) => model.contract == contractID);
  return contractModel;
}
