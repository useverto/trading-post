import { Writable } from "stream";
import chalk from "chalk";
import fecha from "fecha";
// @ts-ignore
import * as rfs from "rotating-file-stream";

/**
 * Levels enum used to determine when to log, `none` means nothing will be logged.
 */
export enum LogLevels {
  "none" = -1,
  "error",
  "warn",
  "info",
  "debug",
}

/**
 * Options for the Log class. Options marked as `undefined` are optional.
 * @param {boolean | undefined} console `boolean | undefined` Whether to log to console or not. Defaults to `process.env.NODE_ENV === 'development'`.
 * @param {LogLevels | undefined} level `LogLevels | undefined` Determines what levels it should log. Default to `LogLevels.debug` if `process.env.NODE_ENV === 'development'`, otherwise `LogLevels.info`.
 * @param {string} name `string` Determines the filename from `logs/${name}.log` to output as.
 * @param {Writable | undefined} stream `Writable | undefined` The stream Log should write to. Defaults to a gzipped [`rotating-file-stream`](https://www.npmjs.com/package/rotating-file-stream) that rotates every 5 days with a maximum of 6 files.
 * @param {boolean | string | undefined} timestamp `boolean | string | undefined` If `true` or `undefined`, defaults to `YYYY-MM-DD HH:mm:ss,SSS` with [Fecha's formatting tokens](https://www.npmjs.com/package/fecha#formatting-tokens). If `false` or an empty string, doesn't output a timestamp at all. If a non-empty string, uses that as formatting for Fecha.
 */
export interface LogOptions {
  console?: boolean;
  level?: LogLevels;
  name: string;
  stream?: Writable;
  timestamp?: boolean | string;
}

export default class Log implements LogOptions {
  /** Levels enum used to determine when to log, `none` means nothing will be logged. */
  public static Levels: typeof LogLevels = LogLevels;

  /** Whether to write to console or not. */
  public console: boolean = true;
  /** The maximum level to output. */
  public level: LogLevels;
  /** Determines the filename from `logs/${name}.log` to output as. */
  public readonly name: string;
  /** The stream to write to. */
  public readonly stream: Writable;
  /** The timestamp format using [Fecha's formatting tokens](https://www.npmjs.com/package/fecha#formatting-tokens) */
  public timestamp: string;

  /** The filepath of the stream. */
  private readonly _filepath: string;

  /**
   * Creates a new instance of Log.
   * @param {LogOptions} options `LogOptions` Options to define Log's behaviour.
   * @returns {Log} `Log` An instance of Log.
   */
  constructor(options: LogOptions) {
    // Set the required options first.
    this.name = options.name;

    // Use the name to determine the path for the stream.
    this._filepath = `logs/${this.name}.log`;

    this.console = options.console || true;

    if (typeof options.level === "undefined") {
      this.level =
        process.env.NODE_ENV === "development"
          ? LogLevels.debug
          : LogLevels.info;
    } else {
      this.level = options.level;
    }

    if (typeof options.stream === "undefined") {
      this.stream = rfs.createStream(this._filepath, {
        compress: "gzip",
        interval: "5d",
        maxFiles: 6,
      });
    } else {
      this.stream = options.stream;
    }

    if (typeof options.timestamp === "string") {
      // If the passed timestamp is a string use that as the format.
      this.timestamp = options.timestamp;
    } else if (typeof options.timestamp === "undefined" || options.timestamp) {
      // If the passed timestamp is unset or `true`, use the default format.
      this.timestamp = "YYYY-MM-DD HH:mm:ss,SSS";
    } else {
      // Otherwise disable the timestamp.
      this.timestamp = "";
    }
  }

  /**
   * Creates a new instance of Log with the properties of the original.
   * @param {Partial<LogOptions>?} options Options to override the original's.
   * @returns {Log} The new instance of Log.
   */
  public extend(options?: Partial<LogOptions>): Log {
    return new Log({
      ...this,
      ...options,
    });
  }

  /**
   * Logs a message with the `Error` level.
   * @param {string} message `string` The message to log.
   * @returns {string | undefined} Returns `string` if something was logged and `undefined` if the Log instance level was lower than the `Error` level.
   */
  public error(message: string): string | undefined {
    if (this.level < LogLevels.error) {
      return;
    }

    this._writeToConsole(message, LogLevels.error);
    return this._writeToStream(message, LogLevels.error);
  }

  /**
   * Logs a message with the `Warn` level.
   * @param {string} message `string` The message to log.
   * @returns {string | undefined} Returns `string` if something was logged and `undefined` if the Log instance level was lower than the `Warn` level.
   */
  public warn(message: string): string | undefined {
    if (this.level < LogLevels.warn) {
      return;
    }

    this._writeToConsole(message, LogLevels.warn);
    return this._writeToStream(message, LogLevels.warn);
  }

  /**
   * Logs a message with the `Info` level.
   * @param {string} message `string` The message to log.
   * @returns {string | undefined} Returns `string` if something was logged and `undefined` if the Log instance level was lower than the `Info` level.
   */
  public info(message: string): string | undefined {
    if (this.level < LogLevels.info) {
      return;
    }

    this._writeToConsole(message, LogLevels.info);
    return this._writeToStream(message, LogLevels.info);
  }

  /**
   * Logs a message with the `Debug` level.
   * @param {string} message `string` The message to log.
   * @returns {string | undefined} Returns `string` if something was logged and `undefined` if the Log instance level was lower than the `Debug` level.
   */
  public debug(message: string): string | undefined {
    if (this.level < LogLevels.debug) {
      return;
    }

    this._writeToConsole(message, LogLevels.debug);
    return this._writeToStream(message, LogLevels.debug);
  }

  /**
   * Writes a message to the console when applicable.
   * @param {string} message `string` The message to write.
   * @param {LogLevels} level `LogLevels` The level to write.
   */
  private _writeToConsole(message: string, level: LogLevels): void {
    if (this.console) {
      console.log(this._formatMessage(message, level, true));
    }
  }

  /**
   * Writes a message to the instance's stream.
   * @param {string} message `string` The message to write.
   * @param {LogLevels} level `LogLevels` The level to write.
   * @returns {string} `string` The formatted message that was logged.
   */
  private _writeToStream(message: string, level: LogLevels): string {
    message = this._formatMessage(message, level) + "\n";
    this.stream.write(message);
    return message;
  }

  /**
   * Formats a message with the level and timestamp (if applicable).
   * @param {string} message `string` The message to be formatted.
   * @param {LogLevels} level `LogLevels` The level to be formatted.
   * @param {boolean?} forConsole `boolean | undefined` Whether to add Chalk styling for the console.
   * @returns {string} `string` The formatted message.
   */
  private _formatMessage(
    message: string,
    level: LogLevels,
    forConsole?: boolean
  ): string {
    const levelString: string = this._getFormattedLevel(level, forConsole);
    const timestamp: string = this._getTimestamp(forConsole);

    message = String(message).replace(/\n/g, "␊");

    if (timestamp.length === 0) {
      return `${levelString} ${message}`;
    }

    return `${timestamp} ${levelString} ${message}`;
  }

  /**
   * Gets a string representation of a LogLevels' value.
   * @param {LogLevels} wanted `LogLevels` The wanted level to get a formatted representation of.
   * @param {boolean?} forConsole `boolean | undefined` Whether to add Chalk styling for the console.
   * @returns {string} `string` The string representation of the wanted level.
   */
  private _getFormattedLevel(wanted: LogLevels, forConsole?: boolean): string {
    let level = "";

    if (wanted === LogLevels.error) {
      level = "Error";
    } else if (wanted === LogLevels.warn) {
      level = "Warn ";
    } else if (wanted === LogLevels.info) {
      level = "Info ";
    } else {
      level = "Debug";
    }

    if (forConsole === true) {
      if (wanted === LogLevels.error) {
        level = chalk.black.bold.red(level);
      } else if (wanted === LogLevels.warn) {
        level = chalk.black.bold.yellow(level);
      } else if (wanted === LogLevels.info) {
        level = chalk.black.bold.green(level);
      } else {
        level = chalk.black.bold.cyan(level);
      }
    }

    return level;
  }

  /**
   * Returns a string timestamp with the current time (if applicable).
   * @param {boolean?} forConsole `boolean | undefined` Whether to add Chalk styling for the console.
   * @returns {string} `string` The string timestamp, the string will be empty if the timestamp format is empty.
   */
  private _getTimestamp(forConsole?: boolean): string {
    if (this.timestamp.length === 0) {
      return "";
    }

    let timestamp: string = fecha.format(new Date(), this.timestamp);
    if (forConsole === true) {
      timestamp = chalk.gray(timestamp);
    }

    return timestamp;
  }
}
