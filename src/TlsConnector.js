const tls = require("tls");
const config = require("./config");
const helpers = require("./helpers");

const Log = () => {
  console.log(...arguments);
};

class TlsConnector {
  socket = null;

  constructor() {
    const { serverConfig } = config;

    this.socket = tls.connect(
      serverConfig.port,
      serverConfig.host,
      {
        rejectUnauthorized: false,
      },
      () => {
        console.log(
          "Client connected",
          this.socket.authorized ? "authorized" : "unauthorized"
        );
        console.log("############################################");
        // process.stdin.pipe(socket);
        // process.stdin.resume();
        // socket.end();
      }
    );

    //   {
    //     host: serverConfig.host,
    //     port: serverConfig.port,
    //     rejectUnauthorized: false,
    //     // timeout: 5000,
    //     // keepAlive: true,
    //     // family: 2,
    //   },
    //   () => {
    //     console.log("############################################");
    //     Log(
    //       "Client connected",
    //       this.socket.authorized ? "authorized" : "unauthorized"
    //     );
    //     console.log("############################################");
    //     process.stdin.pipe(socket);
    //     // process.stdin.resume();
    //     // socket.end();
    //     console.log("############################################");
    //   }
    // );
    this.init();
  }

  finisherMessage() {
    const message = this.socket.getPeerFinished();
    if (message) {
      console.log("Finisher message: ", message);
    }
  }

  init() {
    this.socket.setEncoding("utf8");

    this.heartbeat();

    this.finisherMessage();

    this.socket
      .on("connect", this.onConnect.bind(this))
      .on("data", this.onData)
      .on("timeout", this.onTimeout.bind(this))
      .on("end", this.onEnd)
      .on("error", this.onError)
      .on("close", this.onClose);

    this.finisherMessage();

    console.log("Initialized");
  }

  heartbeat() {
    const heartbeatRequest = `
    <?xml version="1.0" encoding="utf-8"?>
      <ct/>
    `;
    this.write(heartbeatRequest.trim(), (error) => {
      console.log("Error on heartbeat: ", error);
    });
  }

  write(message, cb) {
    this.socket.write(message, cb);
  }

  onData(data) {
    // Log the response from the Socket server.
    const dataString = data.toString();
    console.log("DATA RESPONSE: ", dataString);
  }

  authenticate() {
    const { credentials } = config;

    const authenticationRequest = `
    <?xml version="1.0" encoding="utf-8"?>
    <login>
        <credential>
            <loginname value="${credentials.user}"/>
            <password value="${credentials.password}"/>
        </credential>
    </login>`;
    console.log(
      "Authenticating with: ",
      credentials.user,
      credentials.password
    );
    this.write(authenticationRequest.trim(), (error) => {
      console.log("Authentication error: ", error);
    });
    this.finisherMessage();
    // console.log("Done");
    // this.socket.flush();
  }

  bookMatch() {
    const { matchId } = config;
    const bookRequest = `
    <?xml version="1.0" encoding="utf-8"?>
        <bookmatch matchid="${matchId}"/>
    `;
    console.log("Match booking...");
    this.socket.write(bookRequest.trim(), (error) => {
      console.log("Match booking error: ", error);
    });
    this.finisherMessage();

    // console.log("Done");
    // this.socket.flush();
    // const bookMessageRequest = `
    //     <?xml version="1.0" encoding="utf-8"?>
    //         <match matchid="${matchId}"/>
    //     `;
    // this.socket.write(bookMessageRequest.trim());
    // this.socket.flush();
  }

  onConnect() {
    console.log("Connected");

    setTimeout(() => {
      // Authentication
      this.authenticate();
      // this.bookMatch();
    }, 1000);

    // this.socket.end(() => {
    //   console.log("Client closed successfully");
    // });
  }

  onTimeout() {
    console.log("Connection timeout");
    this.socket.end();
  }

  onEnd() {
    console.log("Client closed successfully");
  }

  onError(error) {
    console.log("ERROR: ", error);
  }

  onClose() {
    console.log("Connection closed");
  }
}

module.exports = TlsConnector;
