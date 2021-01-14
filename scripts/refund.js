const Arweave = require("arweave");
const fs = require("fs");

const client = new Arweave({
  host: "arweave.net",
  port: 443,
  protocol: "https",
});
const jwk = JSON.parse(await fs.readFileSync("./arweave.json"));

const orders = [
  {
    id: "OkHNaEY3Z1WsASwT2gbgsudzZKKJadKRtjFjtcZEDMs",
    addr: "VovTpJyt97jf0WuE0eb8SujuQJ-IWi4OntFshIv9PV0",
    type: "Sell",
    amount: 541925,
    token: "usjm4PCxUd5mtaon7zc97-dt-3qf67yPyqgzLnLqk5A",
  },
  {
    id: "v6CMUuuI9-IecXrVlpf2Qb7ZPMZgw1XmDyC5xkDWqOQ",
    addr: "XUAeWrINohr3c-x7Nm3x7n7hjbtzxFyjX5Bn0JZ_8a8",
    type: "Sell",
    amount: 250000,
    token: "usjm4PCxUd5mtaon7zc97-dt-3qf67yPyqgzLnLqk5A",
  },
  {
    id: "gh_f8bjmxIOVqeHUlBFvBBa0u-pRwZxGFIfF2fPvZaA",
    addr: "XUAeWrINohr3c-x7Nm3x7n7hjbtzxFyjX5Bn0JZ_8a8",
    type: "Sell",
    amount: 250000,
    token: "usjm4PCxUd5mtaon7zc97-dt-3qf67yPyqgzLnLqk5A",
  },
  {
    id: "0oog2TYJmo6K0mjpnG5aQy7dK8rXcM1yQdEm2rMtOkc",
    addr: "XUAeWrINohr3c-x7Nm3x7n7hjbtzxFyjX5Bn0JZ_8a8",
    type: "Sell",
    amount: 279598,
    token: "usjm4PCxUd5mtaon7zc97-dt-3qf67yPyqgzLnLqk5A",
  },
  {
    id: "XpkBzrV3SnLor1UxXYccSXBVcoD_v-zV8_qrDYmRz3U",
    addr: "XUAeWrINohr3c-x7Nm3x7n7hjbtzxFyjX5Bn0JZ_8a8",
    type: "Sell",
    amount: 295222,
    token: "usjm4PCxUd5mtaon7zc97-dt-3qf67yPyqgzLnLqk5A",
  },
  {
    id: "jgrNistb9Wvg-pm3xyhSA35ZskeRooiXGDqbb-siQbU",
    addr: "pvPWBZ8A5HLpGSEfhEmK1A3PfMgB_an8vVS6L14Hsls",
    type: "Swap",
    amount: 5,
    token: "",
  },
  {
    id: "Z0xPm36ef1VTVilmIgtupKbeIvf3XxOAh9qdlqpevxc",
    addr: "vxUdiv2fGHMiIoek5E4l3M5qSuKCZtSaOBYjMRc94JU",
    type: "Buy",
    amount: 0.1,
    token: "",
  },
  {
    id: "SglN92mbPASmx0dkeTQB8rm7iYh6_vOBzPHkWTFmQAI",
    addr: "pvPWBZ8A5HLpGSEfhEmK1A3PfMgB_an8vVS6L14Hsls",
    type: "Buy",
    amount: 0.05,
    token: "",
  },
  {
    id: "6dV1P7WdZameiVOWpmZjOHCk_At1rUlambmeq87q79w",
    addr: "vxUdiv2fGHMiIoek5E4l3M5qSuKCZtSaOBYjMRc94JU",
    type: "Buy",
    amount: 0.1,
    token: "",
  },
  {
    id: "And1f3z8bwopQKq75W6kO2D3aOAGs0LgYz96xQXy5Vs",
    addr: "vxUdiv2fGHMiIoek5E4l3M5qSuKCZtSaOBYjMRc94JU",
    type: "Buy",
    amount: 0.1,
    token: "",
  },
  {
    id: "IbeuQ-enJOI8pfVPh39mfKMQr1DI3ttny1EvsaQj7IY",
    addr: "vxUdiv2fGHMiIoek5E4l3M5qSuKCZtSaOBYjMRc94JU",
    type: "Buy",
    amount: 0.1,
    token: "",
  },
  {
    id: "kC9zbT9uq9u9A0vnI0bTxgsrBLHmk75YgpqTHRDsG7A",
    addr: "vxUdiv2fGHMiIoek5E4l3M5qSuKCZtSaOBYjMRc94JU",
    type: "Buy",
    amount: 0.5,
    token: "",
  },
  {
    id: "y-yf9vS4MgkIOdG8H_4cUebRpW2jMtXWSH1vXc-x84Y",
    addr: "vxUdiv2fGHMiIoek5E4l3M5qSuKCZtSaOBYjMRc94JU",
    type: "Buy",
    amount: 0.2,
    token: "",
  },
  {
    id: "70OE61kcZm6oMaDLmSvE3vOGNHmGpZ7Ltn6osuQaXXY",
    addr: "vxUdiv2fGHMiIoek5E4l3M5qSuKCZtSaOBYjMRc94JU",
    type: "Buy",
    amount: 0.2,
    token: "",
  },
  {
    id: "XNkkc6Fbki6mG5eTpgonw9sPuOVG9AET94l6Sc-5QN0",
    addr: "vxUdiv2fGHMiIoek5E4l3M5qSuKCZtSaOBYjMRc94JU",
    type: "Buy",
    amount: 0.2,
    token: "",
  },
];

async function refund() {
  for (const order of orders) {
    console.log("Order: ", order.id);
    if (order.token) {
      const tags = {
        Exchange: "Verto",
        Type: "Refund",
        Order: order.id,
        "App-Name": "SmartWeaveAction",
        "App-Version": "0.3.0",
        Contract: order.token,
        Input: JSON.stringify({
          function: "transfer",
          target: order.addr,
          qty: order.amount,
        }),
      };

      const tx = await client.createTransaction(
        {
          target: order.addr,
          data: Math.random().toString().slice(-4),
        },
        jwk
      );

      for (const [key, value] of Object.entries(tags)) {
        tx.addTag(key, value.toString());
      }

      await client.transactions.sign(tx, jwk);
      await client.transactions.post(tx);

      console.log("Refund:", tx.id);
    } else {
      const tags = {
        Exchange: "Verto",
        Type: "Refund",
        Order: order.id,
      };

      const tx = await client.createTransaction(
        {
          target: order.addr,
          quantity: client.ar.arToWinston(order.amount.toString()),
        },
        jwk
      );

      for (const [key, value] of Object.entries(tags)) {
        tx.addTag(key, value.toString());
      }

      await client.transactions.sign(tx, jwk);
      await client.transactions.post(tx);
      console.log("Refund:", tx.id);
    }
    console.log();
  }
}

refund();
