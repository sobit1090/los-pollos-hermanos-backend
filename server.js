import dotenv from "dotenv";
dotenv.config({ path: "./config/config.env" });

import app from "./app.js";
import connectDB from "./config/database.js";

const PORT = process.env.PORT || 4000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});

export default app;

