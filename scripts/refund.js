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
    id: "8QEl06McLpsII9lqpfKHxr2-nJKBtoxkYrcosXi95W8",
    addr: "VC4NJ3nlVJJPgyJ4DScpeXx3-UnXmiasfrxiIFpJwb0",
    type: "Cancel",
    amount: 0.5,
    token: "",
  },
  {
    id: "naxRNKFdWneYIoVvzwRAYZLhsZsY4mbANlTzXyVypTA",
    addr: "ovKT2BiXVxxm7Lb_j4VudKOLxH_37fd8hEqnH5ha-gU",
    type: "Cancel",
    amount: 100000,
    token: "0GRLIbU0jmipa-jBuNjrshdBsrw96HTSVdCyLniF1Sg",
  },
  {
    id: "TyxABPIVrdGIdkvsB_4PDACzrloEKUGrccGBp8HCE3A",
    addr: "Pj7FkPedA5AHOrH0TmjKsuNmOnWo1ULOdVjZmDJjW1c",
    type: "Buy",
    amount: 0.001,
    token: "",
  },
  {
    id: "a9jQFoqdeCz0L-IzRnEP-MlJT2tBOjvzSAj-NC-YIPA",
    addr: "vLRHFqCw1uHu75xqB4fCDW-QxpkpJxBtFD9g4QYUbfw",
    type: "Buy",
    amount: 5,
    token: "",
  },
  {
    id: "lrE2WqYBy1e5bmu18cSefRBqKCtNQCwmmR2ab75Lr_Q",
    addr: "vLRHFqCw1uHu75xqB4fCDW-QxpkpJxBtFD9g4QYUbfw",
    type: "Buy",
    amount: 10,
    token: "",
  },
  {
    id: "SoDfElkAEizBGuc4DiuYjF1aAUrmQ93YpiqvC6dZtTM",
    addr: "ovKT2BiXVxxm7Lb_j4VudKOLxH_37fd8hEqnH5ha-gU",
    type: "Sell",
    amount: 1000,
    token: "0GRLIbU0jmipa-jBuNjrshdBsrw96HTSVdCyLniF1Sg",
  },
  {
    id: "WnfpHOBcQ_3gETSWcLayD5UvendsZZw6mSa2zPQf5yE",
    addr: "gDYOOmQNlSKdELG5UsZXqlPWdGnFjqLUF4CVAEO413Y",
    type: "Sell",
    amount: 1000,
    token: "usjm4PCxUd5mtaon7zc97-dt-3qf67yPyqgzLnLqk5A",
  },
  {
    id: "lnq2cLop39sJtX8y92ppTL9Pt_vNe1hwcysT3gN4Wt0",
    addr: "gDYOOmQNlSKdELG5UsZXqlPWdGnFjqLUF4CVAEO413Y",
    type: "Sell",
    amount: 5000,
    token: "usjm4PCxUd5mtaon7zc97-dt-3qf67yPyqgzLnLqk5A",
  },
  {
    id: "QbrIgI5qS9Njug4i6X4GV7C0DKp3d0becJlFdBL3QX4",
    addr: "gDYOOmQNlSKdELG5UsZXqlPWdGnFjqLUF4CVAEO413Y",
    type: "Sell",
    amount: 5000,
    token: "usjm4PCxUd5mtaon7zc97-dt-3qf67yPyqgzLnLqk5A",
  },
  {
    id: "2LyfY9sMu0FH7HuM0u4jYC75LzVS6DNsPdLDfCJydZM",
    addr: "3s33KRGW9qyDCVCSeN_SjwCaCEk5hrtcBfGVmCJrPB8",
    type: "Sell",
    amount: 100,
    token: "-8A6RexFkpfWwuyVO98wzSFZh0d6VJuI-buTJvlwOJQ",
  },
  {
    id: "nRbvFzZYWsX8eDqcZYQ2IFRFJtEConwdGincpDcXE1Q",
    addr: "BXGvIV_l-sXfaeU78F6bU72yUZoMIkBAkXJSMM2cpOY",
    type: "Sell",
    amount: 10,
    token: "-8A6RexFkpfWwuyVO98wzSFZh0d6VJuI-buTJvlwOJQ",
  },
  {
    id: "KZv-h7boqZ7Tki3Isr3M1-yqxg9SwU3W7mHX1btL-6M",
    addr: "BXGvIV_l-sXfaeU78F6bU72yUZoMIkBAkXJSMM2cpOY",
    type: "Sell",
    amount: 10,
    token: "-8A6RexFkpfWwuyVO98wzSFZh0d6VJuI-buTJvlwOJQ",
  },
  {
    id: "8aU-7FphYSU5UklHOF6dDTwvk3nw2TfrOF-GqxFtp9w",
    addr: "BXGvIV_l-sXfaeU78F6bU72yUZoMIkBAkXJSMM2cpOY",
    type: "Sell",
    amount: 1,
    token: "-8A6RexFkpfWwuyVO98wzSFZh0d6VJuI-buTJvlwOJQ",
  },
  {
    id: "Km4s2FmpSAg9FIz_2qAdS9kuytm8iNWMAQS_s3WSCP4",
    addr: "aYFm9TP2G0_gVmzn-lCuYPlg2_Cpksq5VBBFEvDoOxA",
    type: "Sell",
    amount: 1,
    token: "HRut8B98Oe6pjs6OnZBfq93DhQVtRT9VfOER3e1-Ajg",
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
