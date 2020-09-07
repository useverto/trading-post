import { init, collectDatabase, TokenInstance } from "@utils/database";
import { asTree } from "@utils/tree";

export default async () => {
  const connection = await init("./db.db");
  let orders = await collectDatabase(connection);
  orders = orders.filter((i) => i.table !== "__verto__");
  let orderTree: {
    [token: string]: TokenInstance[];
  } = {};
  orders.forEach((element) => {
    orderTree[element.table] = element.data;
  });
  console.log(asTree(orderTree));
};
