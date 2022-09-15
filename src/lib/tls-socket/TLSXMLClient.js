const fs = require("fs");
const path = require("path");
const tls = require("tls");
const EventEmitter = require("events");
const PassThrough = require("stream").PassThrough;
const convert = require("xml2json");
const RequestModule = require("./RequestModule");
const ItemCollector = require("./ItemCollector");

class TLSXMLClient extends EventEmitter {
  constructor(config) {
    super();
    this.socket = null;
    this.user = null;
    this.isConnected = false;
    this.isAuthenticated = false;
    this.reconnectInterval = config.reconnectInterval || 0;
    this.attemptsToReconnect = true;
    this.requests = new RequestModule(config.requestTimeout || 10000);
    this.supressNextECONNREFUSED = false;

    this.connect = () => {
      this.socket = tls.connect(
        config.port,
        config.host,
        config.options,
        () => {
          console.log(`\nConnected to: tcp://${config.host}:${config.port}`);
          if (this.socket.authorized) {
            console.log("\nConnection authorized by a Certificate Authority.");
          } else {
            console.log(
              "\nConnection not authorized: " + this.socket.authorizationError
            );
          }

          this.socket.setEncoding("utf8");

          const { credentials } = config;
          const authenticationRequest = `
                <?xml version="1.0" encoding="utf-8"?>
                <login>
                    <credential>
                        <loginname value="${credentials.user}"/>
                        <password value="${credentials.password}"/>
                    </credential>
                </login>`;

          console.log("\nAuthenticating...");
          this.socket.write(authenticationRequest + "\n", (error) => {
            if (error) {
              console.log("\nAuthentication error");
              console.error(error);
            } else {
              console.log("\nAuthenticatied");
            }
          });
        }
      );

      const collectorStream = new ItemCollector();
      const stream = new PassThrough();

      this.socket.pipe(collectorStream).pipe(stream);

      stream.on("data", (message) => {
        const data = this.transpileXmlMessage(message.toString(), collectorStream);

        if (data === null) {
          console.log("\nNo data");
          return;
        }

        if (data.error) {
          this.emit("error", data.error);
          return;
        }

        if (this.isAuthenticated) {
          if (data) {
            process.stdout.write(".");
            this.emit("message", data);
          }
        } else {
          if (data.login) {
            const element = data.login;
            if (element.result === "valid") {
              this.isAuthenticated = true;
              this.emit("authenticated");
            }
          }
        }
      });

      stream.on("end", (message) => {
        console.log("\nStream end", message);
      });

      this.socket.on("connect", () => {
        this.supressNextECONNREFUSED = false;
        this.isConnected = true;
        clearInterval(this.intervalRef);
      });

      this.socket.on("error", (err) => {
        if (
          this.supressNextECONNREFUSED &&
          err.code &&
          err.code === "ECONNREFUSED"
        ) {
          return;
        }
        this.emit("error", err);
      });

      this.socket.on("close", () => {
        this.requests.cancelAll();
        this.isConnected = false;
        this.user = null;
        this.isAuthenticated = false;
        this.beginReconnectInterval();
        if (!this.supressNextECONNREFUSED) {
          this.emit("close");
        }
      });
    };

    this.beginReconnectInterval();
    this.connect();
  }

  transpileXmlMessage(message, strm) {
    let result = null;
    try {
      result = JSON.parse(convert.toJson(message));
    } catch (e) {
      console.log("\nParsing rrror message: ", e.message); // message.toString()
      console.log("\nLast parsing XML message: ", strm.lastString);
      const W_TO_FILE = true;
      if (W_TO_FILE) {
        const fileName = path.join(
          path.resolve(__dirname, `../../..`),
          `logs/xml/xml-with-errors-${Date.now()}.xml`
        );
        try {
          fs.writeFile(fileName, message.toString(), () => {
            console.log("\nWritten to file: ", fileName);
          });
          // file written successfully
        } catch (err) {
          console.error(err);
        }
      }

      //   throw e;
    }

    return result;
  }

  beginReconnectInterval() {
    if (this.reconnectInterval > 0) {
      this.intervalRef = setTimeout(() => {
        if (!this.isConnected && this.attemptsToReconnect) {
          this.supressNextECONNREFUSED = true;
          this.emit("reconnectAttempt");
          this.connect();
        }
      }, this.reconnectInterval);
    }
  }

  send(message) {
    if (this.socket && this.isAuthenticated) {
      this.socket.write(message + "\n");
    } else {
      this.emit("error", new Error("Not connected or not authenticated"));
    }
  }

  async request(object) {
    if (this.socket && this.isAuthenticated) {
      return await this.requests.sendRequest(object, this.socket);
    } else {
      const err = new Error("Not connected or not authenticated");
      return Promise.reject(err);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.end();
      this.socket.destroy();
    }
    clearInterval(this.intervalRef);
    this.attemptsToReconnect = false;
  }
}

module.exports = TLSXMLClient;
