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
  console.log("Message from WS: ", msg.toString());
});

webSocket.on("error", (error) => {
  console.error(error);
});

tlsSocket.on("authenticated", () => {
  const matchListRequest = `<matchlist hoursback="1" hoursforward="1" includeavailable="yes"/>`;
//   const matchId = `<match matchid="36044657" feedtype="delta"/>`;
  setInterval(() => {
    tlsSocket.send(matchListRequest || matchId);
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
