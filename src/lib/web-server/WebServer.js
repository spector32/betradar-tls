const path = require("path");
const express = require("express");

class WebServer {
  constructor(options = {}) {
    const app = express();
    const port = process.env.PORT || 8000;

    const publicPath = path.resolve(__dirname, "../../public");

    app.use(express.static(publicPath));

    // sendFile will go here
    // app.get("/", (req, res) => {
    //   res.send("Hello World!");
    // });

    app.listen(port, () => {
      console.log("Server started at http://localhost:" + port);
    });
  }
}

module.exports = WebServer;
