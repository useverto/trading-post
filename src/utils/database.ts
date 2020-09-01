import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import Logger from "@utils/logger";

const log = new Logger({
  name: "database",
  level: Logger.Levels.debug,
});

type Order = "Buy" | "Sell";

// We need to declare an interface for our model that is basically what our class would be
export interface TokenInstance {
  txID: string;
  amnt: number;
  rate?: number;
  addr: string;
  type: Order;
  createdAt: Date;
}

/**
 * Establish connection with the sqlite database.
 * @param db sqlite data file location
 */
export async function init(db: string): Promise<Database> {
  const sqlite = await open({
    filename: db,
    driver: sqlite3.Database,
  });

  return sqlite;
}

/**
 * Setup database tables for tokens
 * @param sequelize sqlite3 connection pool
 * @param contracts the contract IDs
 */
export function setupTokenTables(db: Database, contracts: string[]) {
  let contractTables = contracts.map(async (contract) => {
    return await db.exec(`CREATE TABLE IF NOT EXISTS '${contract}' (
      txID STRING NOT NULL PRIMARY KEY,
      amnt INTEGER NOT NULL,
      rate INTEGER,
      addr STRING NOT NULL,
      type STRING NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`);
  });
  return contractTables;
}

export async function saveOrder(
  db: Database,
  token: string,
  entry: TokenInstance
) {
  return await db.run(`INSERT INTO "${token}" VALUES (?, ?, ?, ?, ?)`, [
    entry.txID,
    entry.amnt,
    entry.rate,
    entry.addr,
    entry.type,
  ]);
}

export async function getSellOrders(
  db: Database,
  token: string
): Promise<TokenInstance[]> {
  const orders = await db.get<TokenInstance[]>(
    `SELECT * FROM "${token}" WHERE type = "Sell"`
  );
  if (!orders || orders?.length === 0) {
    log.info(`No sell orders to match with.`);
    return [];
  }
  orders.sort((a, b) => {
    if (a.rate && b.rate) return a.rate - b.rate;
    else return 0;
  });
  return orders;
}

export async function getBuyOrders(
  db: Database,
  token: string
): Promise<TokenInstance[]> {
  const orders = await db.get<TokenInstance[]>(
    `SELECT * FROM "${token}" WHERE type = "Buy"`
  );
  if (!orders || orders?.length === 0) {
    log.info(`No buy orders to match with.`);
    return [];
  }
  orders.sort((a, b) => {
    return +new Date(a.createdAt) - +new Date(b.createdAt);
  });
  return orders;
}
