/* Menjalankan Next dev server tanpa CLI fork (ramah sandbox). */
const http = require("node:http");
const next = require("next");

const port = Number(process.env.PORT || 3100);
const app = next({ dev: true, hostname: "127.0.0.1", port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    http
      .createServer((req, res) => handle(req, res))
      .listen(port, "127.0.0.1", () => {
        console.log(`READY http://127.0.0.1:${port}`);
      });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
