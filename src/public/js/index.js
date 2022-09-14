let socket = new WebSocket("ws://localhost:8080/ws");

socket.onopen = function (e) {
  console.log("[open] Connection established");
  console.log("Sending to server");
  socket.send("My name is John");
};

socket.onmessage = function (event) {
  if (event.data) {
    try {
      const data = JSON.parse(event.data);
      console.log("data: ", data);
    } catch (e) {
      console.log("Could not parse data");
      console.log(e.message);
    }
  }
};

socket.onclose = function (event) {
  if (event.wasClean) {
    console.log(
      `[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`
    );
  } else {
    // e.g. server process killed or network down
    // event.code is usually 1006 in this case
    console.log("[close] Connection died");
  }
};

socket.onerror = function (error) {
  console.log(`[error] ${error.message}`);
};
