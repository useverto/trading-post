## Build from source

> It is recommended to use pre-built production binaries when running a trading post.

In order to build a trading post from source, make sure you have `git` and `node` installed on your machine.

Clone the repo and make it your working directory

```shell script
git clone https://github.com/useverto/trading-post
cd trading-post
```

Using your favourite package manager, download the required dependencies

```shell script
yarn
```

Now, it's time to build the trading post! It is as simple as:

```shell script
yarn prod
```

Awesome! You've successfully built the trading post!
It is now avaliable at `./dist/verto.js`

> Make sure to create a `verto.config.json` for your trading post. See [Configuration](../setup/config.md) for more information.

and finally start the trading post! 🙂

```shell script
node ./dist/verto.js --key-file /path/to/your/keyfile.json
```

Now, you can sit back and relax while the trading post greets you with some colourful logs.
