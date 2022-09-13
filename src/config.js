const serverConfig = {
  host: process.env.BETRADAR_HOST || "livedata.betradar.com",
  port: process.env.BETRADAR_PORT || 2017,
};

const credentials = {
  user: process.env.BETRADAR_USER || "",
  password: process.env.BETRADAR_PASS || "Itf123456",
};

const matchId = 36043889;

module.exports = { serverConfig, credentials, matchId };
