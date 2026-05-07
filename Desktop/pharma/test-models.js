import dotenv from "dotenv";
dotenv.config();
import("./models/index.js").then(models => {
  console.log("✅ Models loaded successfully");
  process.exit(0);
}).catch(err => {
  console.error("❌ Failed to load models:", err);
  process.exit(1);
});
