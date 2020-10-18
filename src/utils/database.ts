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
  received: number;
}
export interface SwapInstance {
  txID: string;
  amnt: number;
  rate?: number;
  addr: string;
  type: Order;
  createdAt: Date;
  received: number;
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
 * Save a buy or sell order in the database
 * @param db sqlite3 connection pool
 * @param token the contract ID
 * @param entry the token instance
 */
export async function saveOrder(
  db: Database,
  token: string,
  entry: TokenInstance
) {
  await db.exec(`CREATE TABLE IF NOT EXISTS "${token}" (
    txID STRING NOT NULL PRIMARY KEY,
    amnt INTEGER NOT NULL,
    rate INTEGER,
    addr STRING NOT NULL,
    type STRING NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    received INTEGER NOT NULL
  )`);
  /**
   * Insert a token instance into the database.
   * NOTE: The following code is not vulnerable to sql injection since invalid table names can never be queried.
   *       The values are assigned via db.run that is capable of preventing any type of injection
   */
  return await db.run(`INSERT INTO "${token}" VALUES (?, ?, ?, ?, ?, ?, ?)`, [
    entry.txID,
    entry.amnt,
    entry.rate,
    entry.addr,
    entry.type,
    entry.createdAt,
    entry.received,
  ]);
}

/**
 * Save a buy or sell swap in the database
 * @param db sqlite3 connection pool
 * @param chain the blockchain name
 * @param entry the swap instance
 */
export async function saveSwap(
  db: Database,
  chain: string,
  entry: SwapInstance
) {
  await db.exec(`CREATE TABLE IF NOT EXISTS "${chain}" (
    txID STRING NOT NULL PRIMARY KEY,
    amnt INTEGER NOT NULL,
    rate INTEGER,
    addr STRING NOT NULL,
    type STRING NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    received INTEGER NOT NULL
  )`);

  return await db.run(`INSERT INTO "${chain}" VALUES (?, ?, ?, ?, ?, ?, ?)`, [
    entry.txID,
    entry.amnt,
    entry.rate,
    entry.addr,
    entry.type,
    entry.createdAt,
    entry.received,
  ]);
}

export async function getOrders(db: Database) {
  let tables: { name: string }[] = await db.all(
    "SELECT name FROM sqlite_master WHERE type='table'"
  );

  let orders: { token: string; orders: TokenInstance[] }[] = [];

  for (const table of tables) {
    if (table.name !== "__verto__") {
      orders.push({
        token: table.name,
        orders: await db.all<TokenInstance[]>(`SELECT * FROM "${table.name}"`),
      });
    }
  }

  return orders;
}

/**
 * Retreive sell orders from the database and sort them by their price.
 * @param db sqlite3 connection pool
 * @param token the contract ID
 */
export async function getSellOrders(
  db: Database,
  token: string
): Promise<TokenInstance[]> {
  /**
   * Retrieve sell orders from the database.
   * NOTE: The following code is not vulnerable to sql injection as it is merely retreiving data.
   */
  const orders = await db.all<TokenInstance[]>(
    `SELECT * FROM "${token}" WHERE type = "Sell"`
  );
  if (!orders || orders?.length === 0) {
    log.info(`No sell orders to match with.`);
    return [];
  }
  /**
   * Sort orders by their rate
   */
  orders.sort((a, b) => {
    if (a.rate && b.rate) return b.rate - a.rate;
    else return 0;
  });
  return orders;
}

/**
 * Retreive buy orders from the database and sort them by date of creation.
 * @param db sqlite3 connection pool
 * @param token the contract ID
 */
export async function getBuyOrders(
  db: Database,
  token: string
): Promise<TokenInstance[]> {
  /**
   * Retrieve sell orders from the database.
   * NOTE: The following code is not vulnerable to sql injection as it is merely retreiving data.
   */
  const orders = await db.all<TokenInstance[]>(
    `SELECT * FROM "${token}" WHERE type = "Buy"`
  );
  if (!orders || orders?.length === 0) {
    log.info(`No buy orders to match with.`);
    return [];
  }
  /**
   * Sort the orders by their date of creation
   */
  orders.sort((a, b) => {
    return +new Date(a.createdAt) - +new Date(b.createdAt);
  });
  return orders;
}

export async function getOrder(
  db: Database,
  token: string,
  txID: string
): Promise<TokenInstance> {
  const order = await db.get<TokenInstance>(
    `SELECT * FROM "${token}" WHERE txID = "${txID}"`
  );
  return order!;
}

/**
 * Save last alive timestamp in database
 * @param db the database connection pool
 */
export async function saveTimestamp(db: Database) {
  await db.exec(`CREATE TABLE IF NOT EXISTS "__verto__" (
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  log.info(`Performing shutdown cleanup.`);
  await db.run(`INSERT INTO "__verto__" VALUES (?)`, [new Date()]);
}

interface DbTimestamp {
  createdAt: Date | string;
}

/**
 * Get the timestamp from database
 * @param db the database connection pool
 */
export async function getTimestamp(db: Database): Promise<DbTimestamp[]> {
  try {
    return await db.all<DbTimestamp[]>(`SELECT * FROM "__verto__"`);
  } catch {
    await db.exec(`CREATE TABLE "__verto__" (
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.run(`INSERT INTO "__verto__" VALUES (?)`, [new Date()]);
    return await getTimestamp(db);
  }
}

/**
 * Setup post shutdown hook and store last uptime in database
 * @param db the database connection pool
 */
export async function shutdownHook(db: Database): Promise<void> {
  // attach user callback to the process event emitter
  // if no callback, it will still exit gracefully on Ctrl-C
  process.on("cleanup", () => saveTimestamp(db));

  // do app specific cleaning before exiting
  process.on("exit", async function () {
    await saveTimestamp(db);
  });

  // catch ctrl+c event and exit normally
  process.on("SIGINT", async function () {
    await saveTimestamp(db);
    process.exit(2);
  });

  //catch uncaught exceptions, trace, then exit normally
  process.on("uncaughtException", async function () {
    await saveTimestamp(db);
    process.exit(99);
  });
}
