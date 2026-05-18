const fs = require("fs");
const https = require("https");
const url = "https://registry.npmjs.org/npm/-/npm-10.9.4.tgz";
const out = process.argv[2];
https.get(url, (res) => {
  if (res.statusCode !== 200) {
    console.error("download failed", res.statusCode);
    process.exit(1);
  }
  const file = fs.createWriteStream(out);
  res.pipe(file);
  file.on("finish", () => file.close(() => process.exit(0)));
}).on("error", (err) => {
  console.error(err.message);
  process.exit(1);
});
