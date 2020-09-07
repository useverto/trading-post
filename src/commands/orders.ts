import { init, collectDatabase, TokenInstance } from "@utils/database";
import { asTree } from "@utils/tree";
import { loadConfig } from "@utils/config";

/**
 * Display the trading post order book
 */
export default async (opts: any) => {
  let cnf = await loadConfig(opts.config);
  const connection = await init(cnf.database);
  let orders = await collectDatabase(connection);
  orders = orders.filter((i) => i.table !== "__verto__");
  let orderTree: {
    [token: string]: TokenInstance[] | { [key: string]: any };
  } = {};
  orders.forEach((element) => {
    orderTree[element.table] =
      element.data.length == 0 ? { "No orders": 0 } : element.data;
  });
  console.log(asTree(orderTree));
};
