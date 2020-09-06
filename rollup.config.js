// rollup.config.js
import typescript from "rollup-plugin-typescript2";
import pkg from "./package.json";
import { createFilter } from "@rollup/pluginutils";
import resolve from "@rollup/plugin-node-resolve";
import alias from "@rollup/plugin-alias";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import yml from "@rollup/plugin-yaml";
import { terser } from "rollup-plugin-terser";

const filter = createFilter("**/*.gql", []);

const config = {
  input: "./src/index.ts",
  output: [
    {
      file: pkg.main,
      format: "cjs",
    },
  ],
  external: [
    "*.gql",
    "*.yml",
    "fs/promises",
    "util",
    "fs",
    "path",
    "child_process",
  ],
  plugins: [
    typescript(),
    json(),
    yml(),
    commonjs({
      include: ["node_modules/**"],
      ignoreGlobal: false,
    }),
    resolve({
      preferBuiltins: true,
      jsnext: true,
    }),
    alias({
      "@api": __dirname + "/src/api",
      "@endpoints": __dirname + "src/api/endpoints",
      "@utils": __dirname + "/src/utils",
      "@workflows": __dirname + "/src/workflows",
      "@commands": __dirname + "/src/commands",
    }),
    {
      name: "string",
      transform(code, id) {
        if (filter(id)) {
          return {
            code: `export default ${JSON.stringify(code)};`,
            map: { mappings: "" },
          };
        }
      },
    },
    terser({
      format: {
        comments: false,
      },
    }),
  ],
};

if (!process.env.PROD)
  config.external.push(...Object.keys(pkg.dependencies || {}));

export default config;
