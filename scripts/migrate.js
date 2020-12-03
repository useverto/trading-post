const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

async function collectTables(db) {
  let tables = await db.all(
    "SELECT name FROM sqlite_master WHERE type='table'"
  );

  return tables
    .map((table) => {
      return table.name;
    })
    .filter((table) => table !== "__verto__")
    .filter((table) => table !== "TX_STORE");
}

async function main() {
  const sqlite = await open({
    filename: "db.db",
    driver: sqlite3.Database,
  });

  let tables = await collectTables(sqlite);

  tables.forEach(async (table) => {
    await sqlite.exec(`ALTER TABLE "${table}" ADD COLUMN token STRING;`);
  });
}

main().catch(console.error);
