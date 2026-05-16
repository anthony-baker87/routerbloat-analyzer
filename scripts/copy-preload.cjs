const fs = require("node:fs");
const path = require("node:path");

const source = path.join(__dirname, "..", "electron", "preload.cjs");
const target = path.join(__dirname, "..", "dist-electron", "preload.cjs");

fs.copyFileSync(source, target);
