import * as fs from "fs";
import { format } from "util";
import { EventEmitter } from "events";

// Usage: 
// import { Logger } from "@utils/logger";
// const log = Logger.create("myfile");
// log.debug("Up and running ;)");

interface ILogLevels {
    [level: string]: string;
}

const LogLevels: ILogLevels = {
  'DEBUG': 'DEBUG',
  'INFO':  'INFO',
  'WARN':  'WARN',
  'ERROR': 'ERROR',
  'NONE':  'NONE',
};

// Global log level
let GlobalLogLevel = LogLevels.DEBUG;

// Global log file name
let GlobalLogfile: string | null = null;

let GlobalEvents = new EventEmitter();

// ANSI colors
let Colors = {
  'Black':   0,
  'Red':     1,
  'Green':   2,
  'Yellow':  3,
  'Blue':    4,
  'Magenta': 5,
  'Cyan':    6,
  'Grey':    7,
  'White':   9,
  'Default': 9,
};

const loglevelColors = [Colors.Cyan, Colors.Green, Colors.Yellow, Colors.Red, Colors.Default];

const defaultOptions = {
  useColors: true,
  color: Colors.Default,
  showTimestamp: true,
  useLocalTime: false,
  showLevel: true,
  filename: GlobalLogfile,
  appendFile: true,
};

class Logger {
  [x: string]: any;
  constructor(category: any, options?: any) {
    this.category = category;
    let opts = {};
    Object.assign(opts, defaultOptions);
    Object.assign(opts, options);
    this.options = opts;
    this.debug = this.debug.bind(this);
    this.log = this.log.bind(this);
    this.info = this.info.bind(this);
    this.warn = this.warn.bind(this);
    this.error = this.error.bind(this);
  }

  debug(...args: string[]) {
    if(this._shouldLog(LogLevels.DEBUG))
      this._write(LogLevels.DEBUG, format(null, ...args));
  }

  log() {
    if(this._shouldLog(LogLevels.DEBUG))
      this.debug(...arguments);
  }

  info() {
    if(this._shouldLog(LogLevels.INFO))
      this._write(LogLevels.INFO, format(null, ...arguments));
  }

  warn() {
    if(this._shouldLog(LogLevels.WARN))
      this._write(LogLevels.WARN, format(null, ...arguments));
  }

  error() {
    if(this._shouldLog(LogLevels.ERROR))
      this._write(LogLevels.ERROR, format(null, ...arguments));
  }

  _write(level: string, text: string) {
    if((this.options.filename || GlobalLogfile) && !this.fileWriter)
      this.fileWriter = fs.openSync(this.options.filename || GlobalLogfile, this.options.appendFile ? 'a+' : 'w+');

    let format = this._format(level, text);
    let unformattedText = this._createLogMessage(level, text);
    let formattedText = this._createLogMessage(level, text, format.timestamp, format.level, format.category, format.text);

    if(this.fileWriter)
      fs.writeSync(this.fileWriter, unformattedText + '\n', null, 'utf-8');

    if(!this.options.useColors) {
      console.log(formattedText)
      GlobalEvents.emit('data', this.category, level, text)
    } 
    }

  _format(level: string, text: string) {
    let timestampFormat = '';
    let levelFormat     = '';
    let categoryFormat  = '';
    let textFormat      = ': ';

    if(this.options.useColors) {
        const levelColor    = Object.keys(LogLevels).map((f: string) => LogLevels[f]).indexOf(level);
        const categoryColor = this.options.color;

        if(this.options.showTimestamp) timestampFormat = '\u001b[3' + Colors.Grey + 'm';

        if(this.options.showLevel) levelFormat = '\u001b[3' + loglevelColors[levelColor] + ';22m';

        categoryFormat = '\u001b[3' + categoryColor + ';1m';
        textFormat = '\u001b[0m: ';
    }
    return {
      timestamp: timestampFormat,
      level: levelFormat,
      category: categoryFormat,
      text: textFormat
    };
}

  _createLogMessage(level: string, text: any, timestampFormat?: string | undefined, levelFormat?: string | undefined, categoryFormat?: string | undefined, textFormat?: string | undefined) {
    timestampFormat = timestampFormat || '';
    levelFormat     = levelFormat     || '';
    categoryFormat  = categoryFormat  || '';
    textFormat      = textFormat      || ': ';

    if(this.options.useColors) {
      if(this.options.showTimestamp)
        timestampFormat = '%c';

      if(this.options.showLevel)
        levelFormat = '%c';

      categoryFormat  = '%c';
      textFormat = ': %c';
    }

    let result = '';

    if(this.options.showTimestamp && !this.options.useLocalTime)
      result += '' + new Date().toISOString() + ' ';

    if(this.options.showTimestamp && this.options.useLocalTime)
      result += '' + new Date().toLocaleString() + ' ';

    result = timestampFormat + result;

    if(this.options.showLevel)
      result += levelFormat + '[' + level +']' + (level === LogLevels.INFO || level === LogLevels.WARN ? ' ' : '') + ' ';

    result += categoryFormat + this.category;
    result += textFormat + text;
    return result;
  }

  _shouldLog(level: string) {
    let envLogLevel = (typeof process !== "undefined" && process.env !== undefined && process.env.LOG !== undefined) ? process.env.LOG.toUpperCase() : null;
    const logLevel = envLogLevel || GlobalLogLevel;
    const levels   = Object.keys(LogLevels).map((f) => LogLevels[f]);
    const index    = levels.indexOf(level);
    const levelIdx = levels.indexOf(logLevel);
    return index >= levelIdx;
  }
};

/* Public API */
export default {
  Colors: Colors,
  LogLevels: LogLevels,
  setLogLevel: (level: string) => {
    GlobalLogLevel = level;
  },
  setLogfile: (filename: string | null) => {
    GlobalLogfile = filename;
  },
  create: (category: any, options?: any) => {
    const logger = new Logger(category, options);
    return logger;
  },
  events: GlobalEvents,
};

const log = new Logger("myfile", {
    useColors: true,     // Enable colors
    color: Colors.White, // Set the color of the logger
    showTimestamp: true, // Display timestamp in the log message
    useLocalTime: false, // Display timestamp in local timezone
    showLevel: true,     // Display log level in the log message
    filename: null,      // Set file path to log to a file
    appendFile: false,    // Append logfile instead of overwriting
  });
log.debug("Up and running ;)");