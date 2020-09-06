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
  /** darwin = macos */
  darwin: `curl -fsSL https://verto.exchange/i/mac | sh`,
  /** win32 is the platform for both Windows 32bit and 64bit */
  win32: `PowerShell -Command "& {Invoke-WebRequest https://verto.exchange/i/windows | Invoke-Expression}"`,
};

export default async () => {
  if (process.platform in installers) {
    log.info(`Installing latest release build for ${process.platform}`);
    const { stdout, stderr } = await exec(installers[process.platform]);
    stderr && log.error(stderr);
    stdout && log.info(stdout);
  }
};
