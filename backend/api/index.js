const { buildApp } = require("../dist/app.js");

let app;

module.exports = async (req, res) => {
  if (!app) {
    app = buildApp();
    await app.ready();
  }
  app.server.emit("request", req, res);
};
