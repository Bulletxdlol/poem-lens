import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["api-src/translate.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: "api/translate.js",
  logLevel: "info",
});

console.log("Built api/translate.js for Vercel");
