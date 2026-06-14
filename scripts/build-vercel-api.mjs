import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["api-src/handler.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: "api/index.js",
  external: ["@vercel/node"],
  logLevel: "info",
});

console.log("Built api/index.js for Vercel");
