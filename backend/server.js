const runtime = require("./config/runtime");
const connectDB = require("./config/db");
const app = require("./app");

async function start() {
  await connectDB();

  app.listen(runtime.port, () => {
    console.log(`BundleBee API listening on port ${runtime.port} (${runtime.nodeEnv})`);
  });
}

start().catch((error) => {
  console.error("BundleBee startup failed:", error);
  process.exit(1);
});
