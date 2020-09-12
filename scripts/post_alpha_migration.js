const { open, Database } = require("sqlite");
const sqlite3 = require("sqlite3");

const sqlite = await open({
    filename: "db.db",
    driver: sqlite3.Database,
});

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