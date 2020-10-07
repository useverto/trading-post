import { init, getOrders, TokenInstance } from "@utils/database";
import { asTree } from "@utils/tree";
import { loadConfig } from "@utils/config";
import chalk from "chalk";

/**
 * Display the trading post order book
 */
export default async (opts: any) => {
  let cnf = await loadConfig(opts.config);
  const connection = await init(cnf.database);
  let orders = await getOrders(connection);
  let orderTree: {
    [token: string]: TokenInstance[] | string | { [key: string]: any };
  } = {};
  orders.forEach((element) => {
    let token = chalk.italic.grey(element.token);
    orderTree[token] = element.orders.length == 0 ? "No orders" : element.orders;
  });
  console.log(asTree(orderTree, true));
};
