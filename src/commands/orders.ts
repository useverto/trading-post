import { init, collectDatabase, TokenInstance } from "@utils/database";
import { asTree } from "@utils/tree";
import { loadConfig } from "@utils/config";
import chalk from "chalk";

/**
 * Display the trading post order book
 */
export default async (opts: any) => {
  let cnf = await loadConfig(opts.config);
  const connection = await init(cnf.database);
  let orders = await collectDatabase(connection);
  orders = orders.filter((i) => i.table !== "__verto__");
  let orderTree: {
    [token: string]: TokenInstance[] | string | { [key: string]: any };
  } = {};
  orders.forEach((element) => {
    let token = chalk.italic.grey(element.table);
    orderTree[token] = element.data.length == 0 ? "No orders" : element.data;
  });
  console.log(asTree(orderTree, true));
};
