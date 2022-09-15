require("dotenv").config();

const config = require("./config");
const TLSXMLClient = require("./lib/tls-socket/TLSXMLClient");
const WebServer = require("./lib/web-server/WebServer");
const WebSocketProvider = require("./lib/web-socket/WebSocket");

const { serverConfig, credentials } = config;

const userInfo = {
  isAuthenticated: false,
  sessionSet: false,
};

const webSocket = new WebSocketProvider();

const tlsSocket = new TLSXMLClient({
  host: serverConfig.host,
  port: serverConfig.port,
  credentials,
});

const EXPLICIT_MATCH_ID = process.env.EXPLICIT_MATCH_ID || null;

let subscribtionInterval;
const subscribeToMatch = (matchId, socket) => {
  console.log("\nSubscribing to match: ", matchId);
  const matchById = `<match matchid="${matchId}"  />`;
  const cbCall = () => {
    socket.send(matchById);
  };

  cbCall();
  clearInterval(subscribtionInterval);
  subscribtionInterval = setInterval(cbCall, 1000);
};

webSocket.on("message", (msg) => {
  const msgString = msg.toString();

  if (userInfo.isAuthenticated && msgString === "session:start") {
    if (EXPLICIT_MATCH_ID) {
      setTimeout(() => {
        subscribeToMatch(EXPLICIT_MATCH_ID, tlsSocket);
      }, 1000);
    }
    userInfo.sessionSet = true;
  }

  if (userInfo.isAuthenticated && msgString.startsWith("subscribe_match:")) {
    // seit jau var taisīt datu pieprasījumu uz serveri ar " tlsSocket.send(<XML no specenes>);"

    const part = msgString.split("subscribe_match:");
    if (part.length > 1) {
      const matchId = part[1];
      if (!EXPLICIT_MATCH_ID) {
        setTimeout(() => {
          subscribeToMatch(matchId, tlsSocket);
        }, 1000);
      }
    }
    userInfo.sessionSet = true;
  }
});

webSocket.on("error", (error) => {
  console.error(error);
});

tlsSocket.on("authenticated", () => {
  userInfo.isAuthenticated = true;
  setTimeout(() => {
    tlsSocket.send("<servertime/>");
  }, 15000);
});

tlsSocket.on("message", (data) => {
  if (webSocket.hasSocket()) {
    webSocket.send(data);
  }
});

tlsSocket.on("error", (error) => {
  console.log("error: ", error.message);
  // process.exit(1);
});

const webServer = new WebServer();
