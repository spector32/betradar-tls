// const fs = require("fs");
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
          console.log(`Connected to: tcp://${config.host}:${config.port}`);
          if (this.socket.authorized) {
            console.log("Connection authorized by a Certificate Authority.");
          } else {
            console.log(
              "Connection not authorized: " + this.socket.authorizationError
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

          console.log("Authenticating...");
          this.socket.write(authenticationRequest + "\n", (error) => {
            if (error) {
              console.log("Authentication error");
              console.error(error);
            } else {
              console.log("Authenticatied");
            }
          });

          this.socket.write(
            '<matchlist hoursback="1" hoursforward="1" includeavailable="yes"/>' +
              "\n",
            (error) => {
              if (error) {
                console.log("matchlist error");
                console.error(error);
              } else {
                // console.log("match got");
              }
            }
          );
        }
      );

      const collectorStream = new ItemCollector();
      const stream = new PassThrough();

      this.socket.pipe(collectorStream).pipe(stream);

      stream.on("data", (message) => {
        const data = this.transpileXmlMessage(message);

        if (data === null) {
          console.log("No data");
          return;
        }

        if (data.error) {
          this.emit("error", data.error);
          return;
        }

        if (this.isAuthenticated) {
          if ("ct" in data) {
            // console.log("ping");
          }
          //   else if (message) {
          //     this.requests.client_handleResponse(message, this);
          //   } else if (message.responseId) {
          //     this.requests.handleRequest(message);
          //   }
          else {
            if (data) {
              this.emit("message", data);
            }
            // console.log("Else message: ", message);
            // if (false && message) {
            //   // keep alive
            //   this.send('<?xml version="1.0" encoding="utf-8"?>\n<ct/>');
            // } else {
            //   // regular message
            //   this.emit("message", message);
          }
        } else {
          if (data.login) {
            const element = data.login;
            if (element.result === "valid") {
              this.isAuthenticated = true;
              // this.user = data.user;
              // console.log("this.user: ", data.user);
              this.emit("authenticated");
            }
          }
        }
      });

      //   stream.on("finish", () => {
      //     const buffer = Buffer.concat(chunks, totalChunkSize);
      //     // console.log("Finish", buffer.toString());
      //     try {
      //       fs.writeFileSync("./test.xml", buffer.toString());
      //       // file written successfully
      //     } catch (err) {
      //       console.error(err);
      //     }
      //   });

      stream.on("end", (message) => {
        console.log("Stream end", message);
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

  transpileXmlMessage(message) {
    let result = null;
    try {
      result = JSON.parse(convert.toJson(message));
    } catch (e) {
      console.log("e.message: ", e.message, message);
      console.log(message);
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
      this.emit("error", new Error("not connected or not authenticated"));
    }
  }

  async request(object) {
    if (this.socket && this.isAuthenticated) {
      return await this.requests.sendRequest(object, this.socket);
    } else {
      const err = new Error("not connected or not authenticated");
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
