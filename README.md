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

### Book

The trading post book is a detailed guide to setting up a trading post. You can find it [here](./book)

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

#### Conclusion

After you've started the trading post, you might want to [set up a reverse proxy](./book/dev/PROXY.md) for the trading post API.

And that's it! Your trading post will proceed to send a genesis transaction to the exchange wallet, which will officially list it on the [gallery](https://verto.exchange/gallery)!

If you have any questions or need to talk to someone, join our [Discord](https://discord.gg/RnWbc8Y)!

## Special Thanks

- [Sam Williams](https://github.com/samcamwilliams)
- [Cedrik Boudreau](https://github.com/cedriking)
- [Aidan O'Kelly](https://github.com/aidanok)

## License

The code contained within this repository is licensed under the MIT license.
See [`./LICENSE`](./LICENSE) for more information.
