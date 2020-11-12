## Configuration

Before deploying a trading post, you'll want to properly configure the system. You'll also need to drag & drop your keyfile to the root of this repository and make sure the name of the file is `arweave.json`.

## verto.config.json

The `verto.config.json` file is where the majority of your configuration will lie. You'll need to create this file before you can run a trading post. As seen in the config.example.json file, it must contain the following information:

```json
{
  "genesis": {
    "acceptedTokens": [
      "fE2OcfjlS-sHqG5K8QvxE8wHtcqKxS-YV0bDEgxo-eI",
      "FcM-QQpfcD0xTTzr8u4Su9QCgcvRx_JH4JSCQoFi6Ck"
    ],
    "tradeFee": 0.01,
    "publicURL": "your-trading-post-domain.com",
    "version": "0.2.0"
  },
  "database": "./path/to/a/verto.db",
  "api": {
    "port": 8080,
    "host": "localhost"
  }
}
```

- acceptedTokens: This is the place for you to add all of the tokens you want your trading post to accept and exchange. To get a list of tokens officially supported, see https://verto.exchange/gallery. You can even add support for tokens not on that list!
- tradeFee: This is the fee that your trading post will take when an exchange is made. You get to choose your own fee, but know that others may try to compete with lower fees!
- publicURL: You'll need to add the publically available domain/IP that the trading post API will be accessible from in this variable. To ensure the uptime of a trading post, each trading post hosts its own API for the frontend to ping whenever a trade is initiated.
- version: The current trading post version.
- database: This field is where your database will be created.
- api: If you want to modify the host and port of the API, you can do it in these variables.

> As of now, this configuration cannot be changed after the genesis transaction of a trading post. We're hoping to add support for configuration changes soon!
