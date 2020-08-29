// rollup.config.js
import cfg from "./rollup.config";
import multi from "@rollup/plugin-multi-entry";

cfg.output = [
  {
    file: "./build/verto.test.js",
    format: "cjs",
    sourcemap: true,
    globals: {
      it: "it",
      describe: "describe",
    },
  },
];
cfg.plugins = [...cfg.plugins, multi()];
cfg.input = "test/**/*.test.ts";

export default cfg;
