const heartbeat = (socket) => {
  console.log("Writing heartbeat...");
  const str = '<?xml version="1.0" encoding="utf-8"?>\n<ct/>\n';
  socket.write(str.trim());
};

module.exports = {
  heartbeat,
};
