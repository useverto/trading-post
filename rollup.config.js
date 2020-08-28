// rollup.config.js
import typescript from "rollup-plugin-typescript2";
import pkg from "./package.json";
import { createFilter } from "@rollup/pluginutils";
import resolve from "@rollup/plugin-node-resolve";
import alias from "@rollup/plugin-alias";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import yml from "@rollup/plugin-yaml";

const filter = createFilter("**/*.gql", []);

export default {
  input: "./src/index.ts",
  output: [
    {
      file: pkg.main,
      format: "cjs",
    },
  ],
  external: [...Object.keys(pkg.dependencies || {}), "*.gql", "*.yml"],
  plugins: [
    typescript(),
    json(),
    yml(),
    resolve(),
    alias({
      "@utils": __dirname + "/src/utils",
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
    commonjs(),
  ],
};
