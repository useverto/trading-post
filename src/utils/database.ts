import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import Logger from "@utils/logger";

const log = new Logger({
  name: "database",
  level: Logger.Levels.debug,
});

type Order = "Buy" | "Sell";

// We need to declare an interface for our model that is basically what our class would be
export interface OrderInstance {
  txID: string;
  amnt: number;
  rate?: number;
  addr: string;
  type: Order;
  createdAt: Date;
  received: number;
  token?: string;
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

  await sqlite.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA temp_store=memory;
    PRAGMA page_size=4096;
    PRAGMA mmap_size=6000000;
    PRAGMA optimize;
  `);

  return sqlite;
}

/**
 * Save a buy or sell order in the database
 * @param db sqlite3 connection pool
 * @param table
 * @param entry the order instance
 */
export async function saveOrder(
  db: Database,
  table: string,
  entry: OrderInstance
) {
  await db.exec(`CREATE TABLE IF NOT EXISTS "${table}" (
    txID STRING NOT NULL PRIMARY KEY,
    amnt INTEGER NOT NULL,
    rate INTEGER,
    addr STRING NOT NULL,
    type STRING NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    received INTEGER NOT NULL,
    token STRING
  )`);
  /**
   * Insert a token instance into the database.
   * NOTE: The following code is not vulnerable to sql injection since invalid table names can never be queried.
   *       The values are assigned via db.run that is capable of preventing any type of injection
   */
  return await db.run(
    `INSERT INTO "${table}" VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.txID,
      entry.amnt,
      entry.rate,
      entry.addr,
      entry.type,
      entry.createdAt,
      entry.received,
      entry.token,
    ]
  );
}

export async function getOrders(db: Database) {
  let tables: { name: string }[] = await db.all(
    "SELECT name FROM sqlite_master WHERE type='table'"
  );

  let orders: { token: string; orders: OrderInstance[] }[] = [];

  for (const table of tables) {
    if (table.name !== "__verto__") {
      orders.push({
        token: table.name,
        orders: await db.all<OrderInstance[]>(`SELECT * FROM "${table.name}"`),
      });
    }
  }

  return orders;
}

/**
 * Retreive sell orders from the database and sort them by their price.
 * @param db sqlite3 connection pool
 * @param table
 */
export async function getSellOrders(
  db: Database,
  table: string
): Promise<OrderInstance[]> {
  /**
   * Retrieve sell orders from the database.
   * NOTE: The following code is not vulnerable to sql injection as it is merely retreiving data.
   */
  let orders: OrderInstance[];
  try {
    orders = await db.all<OrderInstance[]>(
      `SELECT * FROM "${table}" WHERE type = "Sell"`
    );
  } catch {
    // table doesn't exist
    orders = [];
  }
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
 * @param table
 */
export async function getBuyOrders(
  db: Database,
  table: string
): Promise<OrderInstance[]> {
  /**
   * Retrieve sell orders from the database.
   * NOTE: The following code is not vulnerable to sql injection as it is merely retreiving data.
   */
  let orders: OrderInstance[];
  try {
    orders = await db.all<OrderInstance[]>(
      `SELECT * FROM "${table}" WHERE type = "Buy"`
    );
  } catch {
    // table doesn't exist
    orders = [];
  }
  if (!orders || orders?.length === 0) {
    log.info(`No buy orders to match with.`);
    return [];
  }
  /**
   * Sort orders by their rate
   */
  orders.sort((a, b) => {
    if (a.rate && b.rate) return a.rate - b.rate;
    else return 0;
  });
  return orders;
}

export async function getOrder(
  db: Database,
  table: string,
  txID: string
): Promise<OrderInstance> {
  const order = await db.get<OrderInstance>(
    `SELECT * FROM "${table}" WHERE txID = "${txID}"`
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

export async function saveHash(
  db: Database,
  entry: {
    txHash: string;
    chain: string;
    token?: string;
    sender: string;
  }
) {
  await db.exec(`CREATE TABLE IF NOT EXISTS "TX_STORE" (
    txHash STRING NOT NULL PRIMARY KEY,
    parsed INTEGER NOT NULL DEFAULT 0,
    chain STRING NOT NULL,
    token STRING,
    sender STRING NOT NULL
  )`);

  return await db.run(`INSERT INTO "TX_STORE" VALUES (?, ?, ?, ?, ?)`, [
    entry.txHash,
    0,
    entry.chain,
    entry.token,
    entry.sender,
  ]);
}

export async function getTxStore(db: Database): Promise<
  {
    txHash: string;
    chain: string;
    token?: string;
    sender: string;
  }[]
> {
  let store: {
    txHash: string;
    chain: string;
    token?: string;
    sender: string;
  }[] = [];
  try {
    store = await db.all(`SELECT * FROM "TX_STORE" WHERE parsed = 0`);
  } catch {
    // do nothing
  }

  return store;
}
