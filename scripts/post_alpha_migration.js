const { open, Database } = require("sqlite");
const sqlite3 = require("sqlite3");

async function collectDatabase(db) {
  let tables = await db.all(
    "SELECT name FROM sqlite_master WHERE type='table'"
  );
  let columns = tables.map(async (table) => {
    return {
      table: table.name,
      data: await db.all(`SELECT * FROM "${table.name}"`),
    };
  });

  let data = await Promise.all(columns);
  return data;
}

async function main() {
  const sqlite = await open({
    filename: "db.db",
    driver: sqlite3.Database,
  });

  let dbTables = await collectDatabase(sqlite);
  dbTables = dbTables.filter((i) => i.table !== "__verto__");
  dbTables.forEach(async (table) => {
    await sqlite.exec(
      `ALTER TABLE "${table.table}" ADD COLUMN received INTEGER NOT NULL DEFAULT 0;`
    );
  });
}

main().catch(console.error);
