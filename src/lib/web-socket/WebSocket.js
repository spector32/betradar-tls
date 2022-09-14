const WebSocket = require("ws");
const EventEmitter = require("events");

class WebSocketProvider extends EventEmitter {
  constructor(options = {}) {
    super(options);

    const port = options.port || 8080;
    this.wss = new WebSocket.Server({ port });

    console.log("Web socket");

    this.wss.on("connection", (ws) => {
      console.log(`Connection established localhost:${port}`);
      this.socket = ws;
      this.socket.on("message", (message) => {
        this.emit("message", message);
      });
    });
  }

  send(message) {
    if (this.socket) {
      this.socket.send(JSON.stringify(message));
    } else {
      this.emit("error", new Error("No websocket"));
    }
  }

  hasSocket() {
    return !!this.socket;
  }
}

module.exports = WebSocketProvider;
