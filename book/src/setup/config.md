## Configuration

Before deploying a trading post, you'll want to properly configure the system. You'll also need to drag & drop your keyfile to the root of your trading post and make sure the name of the file is `arweave.json`.

## verto.config.json

The `verto.config.json` file is where the majority of your configuration will lie. You'll need to create this file before you can run a trading post. As seen in the config.example.json file, it must contain the following information:

```json
{
  "genesis": {
    "blockedTokens": [],
    "chain": { "ETH": "0x70dd63799560097E7807Ea94BA0CE5A85C1feAD8" },
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

- `blockedTokens`: This is the place for you to add all of the tokens you **don't** want your trading post to accept and exchange. By default, any PST is supported for trading.
- `chain`: The object that contains the wallet addresses for accepting other currencies. Right now, Verto supports and requires trading with Ethereum, so your Ethereum address should go here.
- `tradeFee`: This is the fee that your trading post will take when an exchange is made. You get to choose your own fee, but know that others may try to compete with lower fees!
- `publicURL`: You'll need to add the publically available domain/IP that the trading post API will be accessible from in this variable. To ensure the uptime of a trading post, each trading post hosts its own API for the frontend to ping whenever a trade is initiated.
- `version`: The current trading post version.
- `database`: This field is where your database will be created.
- `api`: If you want to modify the host and port of the API, you can do it in these variables.

> You can easily change this configuration by updating `verto.config.json` and restarting your trading post!
