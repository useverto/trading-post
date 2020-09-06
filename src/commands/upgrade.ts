import { exec as execProcess } from "child_process";
import { promisify } from "util";
import Logger, { LogLevels } from "@utils/logger";

const exec = promisify(execProcess);

const log = new Logger({
  name: "upgrade",
  level: LogLevels.debug,
});

type Installer = {
  [key in "linux" | "darwin" | "win32" | any]: string;
};

const installers: Installer = {
  linux: `curl -fsSL https://verto.exchange/i/linux | sh`,
  darwin: `curl -fsSL https://verto.exchange/i/mac | sh`,
  win32: `iwr https://verto.exchange/i/windows | iex`,
};

export default async () => {
  if (process.platform in installers) {
    log.info(`Installing latest release build for ${process.platform}`);
    const { stdout, stderr } = await exec(installers[process.platform]);
    stderr && log.error(stderr);
    stdout && log.info(stdout);
  }
};
