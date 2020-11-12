const Verto = require("@verto/lib");

let vrt = new Verto(null, null, {
  exchangeContract: "fE2OcfjlS-sHqG5K8QvxE8wHtcqKxS-YV0bDEgxo-eI",
});

(async () => {
  console.log(await vrt.getTradingPosts());
})();
