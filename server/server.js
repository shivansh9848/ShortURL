require("dotenv").config();
const cors = require("cors");

const express = require("express");
const mainRoute = require("./src/routes/main");
const purgeAliases = require("./src/workers/purgeAliases");
const connectDB = require("./src/helpers/mongodb").connectDB;
const redisClient = require("./src/helpers/redis").client;

connectDB(); // MongoDB
redisClient.on("connect", () => console.log("✅ Redis connected"));

const app = express();
app.use(cors());
app.use(express.json());

app.use("/", mainRoute);

app.get("*", (req, res) => {
  res.send("<h1>404 Not Found</h1>");
});

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  console.log(`App started on port ${PORT}`);
  purgeAliases(); // run your cleanup worker safely
});
