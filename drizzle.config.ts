import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({
  path: ".env",
});

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in .env file");
}

export default defineConfig({
  schema: "./shared/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
