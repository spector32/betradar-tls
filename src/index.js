require("dotenv").config();

const config = require("./config");
const TLSXMLClient = require("./lib/tls-socket/TLSXMLClient");
const WebServer = require("./lib/web-server/WebServer");
const WebSocketProvider = require("./lib/web-socket/WebSocket");

const { serverConfig, credentials } = config;

const webSocket = new WebSocketProvider();

const tlsSocket = new TLSXMLClient({
  host: serverConfig.host,
  port: serverConfig.port,
  credentials,
});

webSocket.on("message", (msg) => {
  const msgString = msg.toString();
  console.log("Message from WS: ", msg.toString());

  if (msgString.startsWith("subscribe_match:")) {
    const part = msgString.split("subscribe_match:");
    if (part.length > 1) {
      const matchId = part[1];
      // <match matchid="944423"/>
      console.log("Subscribing to match: ", matchId);
      const matchById = `<match matchid="${matchId}" />`;
      tlsSocket.send(matchById);
    }
  }
});

webSocket.on("error", (error) => {
  console.error(error);
});

tlsSocket.on("authenticated", () => {
  const matchListRequest = `<matchlist hoursback="1" hoursforward="1" includeavailable="yes"/>`;
  setInterval(() => {
    tlsSocket.send(matchListRequest);
  }, 10000);
});

tlsSocket.on("message", (data) => {
  if (webSocket.hasSocket()) {
    webSocket.send(data);
  }
});

tlsSocket.on("error", (error) => {
  console.log("error: ", error);
});

const webServer = new WebServer();
