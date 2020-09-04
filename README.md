<p align="center">
  <a href="https://verto.exchange">
    <img src="https://raw.githubusercontent.com/useverto/design/master/logo/logo_light.svg" alt="Verto logo (light version)" width="110" />
  </a>

  <h3 align="center">Verto Trading Posts</h3>

  <p align="center">
    Everything needed to become part of the Verto Exchange Network
  </p>

  <p align="center">
    <img src="https://github.com/t8/trading-post-v2/workflows/ci/badge.svg" alt="Fancy CI badge" />
  </p>

</p>

## About

This repository contains all of the necessary code to start a trading post of your own.

You can access the code for our frontend [here](https://github.com/useverto/verto).

> Important Notice: Verto is in its Alpha stage. If you have a suggestion, idea, or find a bug, please report it! The Verto team will not be held accountable for any funds lost.

## Guide

Deploying your own trading post is extremely easy! In this short guide, we'll show you exactly what to do.

### Token Staking

To ensure the integrity of the Verto Trading Post Network, you'll need to purchase and stake `VRT` tokens. The more tokens you stake, the higher your reputation will be. If a trading post begins acting malicious, the Verto DAO will be able to vote to slash that trading post's stake.

You can purchase `VRT` with `AR` on [Verto](https://verto.exchange/trade)!

To stake, you need to lock tokens in the vault on our [Community](https://community.xyz/#aALHIrtzQzy88AhH9uVGxr2GrdSngu2x1CYbyi50JaA/vault).

> Note: You must use configure the trading post to use the same wallet as the one you have staked currency in.

#### Reputation

As mentioned above, you'll need to stake `VRT` tokens to be a trading post. A trading post's reputation is determined by the following factors:

- Amount of stake (weighted at 50%)
  - A medium that the DAO can hold the trading post accountable for
- Amount of time staked (weighted at 33%)
  - Provides proof of dedication to the platform
- Balance (weighted at 17%)
  - Provides a rough estimation for the popularity of the trading post

### Getting Started

#### Configuration

Before deploying a trading post, you'll want to properly configure the system. You'll also need to drag & drop your keyfile to the root of this repository and make sure the name of the file is  `arweave.json`.

##### verto.config.json
The `verto.config.json` file is where the majority of your configuration will lie. You'll need to create this file before you can run a trading post. As seen in the config.example.json file, it must contain the following information:

```json
{
  "genesis": {
    "acceptedTokens": [
      "fE2OcfjlS-sHqG5K8QvxE8wHtcqKxS-YV0bDEgxo-eI",
      "FcM-QQpfcD0xTTzr8u4Su9QCgcvRx_JH4JSCQoFi6Ck"
    ],
    "tradeFee": 0.01,
    "publicURL": "your-trading-post-domain.com"
  },
  "database": "./db.db",
  "api": {
    "port": 8080,
    "host": "localhost"
  }
}
```

- acceptedTokens: This is the place for you to add all of the tokens you want your trading post to accept and exchange. To get a list of tokens officially supported, see https://verto.exchange/gallery. You can even add support for tokens not on that list!
- tradeFee: This is the fee that your trading post will take when an exchange is made. You get to choose your own fee, but know that others may try to compete with lower fees!
- publicURL: You'll need to add the domain that the trading post API will be accessible from in this variable. To ensure the uptime of a trading post, each trading post hosts its own API for the frontend to ping whenever a trade is initiated.
- database: This field is where your database will be created.
- api: If you want to modify the host and port of the API, you can do it in these variables.

> As of now, this configuration cannot be changed after the genesis transaction of a trading post. We're hoping to add support for configuration changes soon!

#### Running the Trading Post

##### Build from source

To run your trading post, you just need to type these three commands in the repository root:

```shell script
yarn
```

```shell script
yarn build
```

```shell script
yarn dev
```

##### Install the binary

This is coming soon!

#### Conclusion

And that's it! Your trading post will proceed to send a genesis transaction to the exchange wallet, which will officially list it on the [gallery](https://verto.exchange/gallery)! 

If you have any questions or need to talk to someone, join our [Discord](https://discord.gg/RnWbc8Y)!

## Special Thanks

- [Sam Williams](https://github.com/samcamwilliams)
- [Cedrik Boudreau](https://github.com/cedriking)
- [Aidan O'Kelly](https://github.com/aidanok)

## License

The code contained within this repository is licensed under the MIT license.
See [`./LICENSE`](./LICENSE) for more information.
