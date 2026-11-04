/* Unduh cloudflared.exe (sekali pakai) untuk tunnel HTTPS sementara. */
const fs = require("node:fs");
const https = require("node:https");
const path = require("node:path");

const URL =
  "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe";
const DEST = path.join(__dirname, "..", "cloudflared.exe");

function get(url, redirects = 0) {
  if (redirects > 6) throw new Error("terlalu banyak redirect");
  https
    .get(url, { headers: { "User-Agent": "ngariung-setup" } }, (res) => {
      const { statusCode, headers } = res;
      if (statusCode && statusCode >= 300 && statusCode < 400 && headers.location) {
        res.resume();
        get(headers.location, redirects + 1);
        return;
      }
      if (statusCode !== 200) {
        console.error("HTTP", statusCode);
        process.exit(1);
      }
      const out = fs.createWriteStream(DEST);
      res.pipe(out);
      out.on("finish", () => {
        out.close(() => {
          const stat = fs.statSync(DEST);
          console.log("downloaded", DEST, stat.size, "bytes");
        });
      });
    })
    .on("error", (err) => {
      console.error("GAGAL", err.message);
      process.exit(1);
    });
}

get(URL);
