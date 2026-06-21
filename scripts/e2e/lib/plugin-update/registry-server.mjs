// Fixture npm registry server for plugin update E2E scenarios.
import http from "node:http";

const metadata = {
  name: "@example/lossless-oriro",
  "dist-tags": { latest: "0.9.0" },
  versions: {
    "0.9.0": {
      name: "@example/lossless-oriro",
      version: "0.9.0",
      dist: {
        integrity: "sha512-same",
        shasum: "same",
        tarball: "http://127.0.0.1:4873/@example/lossless-oriro/-/lossless-oriro-0.9.0.tgz",
      },
    },
  },
};

const server = http.createServer((req, res) => {
  if (req.url === "/@example%2flossless-oriro" || req.url === "/@example%2Flossless-oriro") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(metadata));
    return;
  }
  res.writeHead(404, { "content-type": "text/plain" });
  res.end(`not found: ${req.url}`);
});

server.listen(4873, "127.0.0.1");
