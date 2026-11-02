#!/usr/bin/env node
/**
 * Creates the first RAFTAR administrator from the terminal.
 *
 *   npm run create-admin
 *
 * The script prompts for name, email and a password, hashes the password with
 * bcrypt and stores the account with the `admin` role. It never prints the
 * password or the stored hash, refuses duplicate emails and refuses to create a
 * second account for an email that already exists.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Standalone Node does not read Next.js env files, so load them explicitly.
for (const file of [".env.local", ".env"]) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) continue;
  for (const raw of readFileSync(path, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: String,
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["customer", "admin", "staff", "partner"], default: "customer" },
    status: { type: String, enum: ["active", "suspended", "pending"], default: "active" },
    permissions: [{ type: String }],
  },
  { timestamps: true },
);
const User = mongoose.models.User || mongoose.model("User", UserSchema);

/** Read a line while masking the characters (passwords never echo to the terminal). */
function askHidden(query) {
  return new Promise((resolvePromise, rejectPromise) => {
    stdout.write(query);
    let buffer = "";
    const onData = (chunk) => {
      const text = chunk.toString("utf8");
      for (const char of text) {
        if (char === "\n" || char === "\r" || char === "\u0004") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          stdout.write("\n");
          resolvePromise(buffer);
          return;
        }
        if (char === "\u0003") {
          stdin.setRawMode(false);
          stdin.pause();
          rejectPromise(new Error("Cancelled."));
          return;
        }
        if (char === "\u007f" || char === "\b") {
          buffer = buffer.slice(0, -1);
          continue;
        }
        buffer += char;
      }
    };
    stdin.setEncoding("utf8");
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
  });
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("\nMONGODB_URI is not configured. Add it to .env.local before running this script.");
    process.exit(1);
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });
  console.log("\nRAFTAR — create administrator\n");

  const name = (await rl.question("Name: ")).trim();
  const email = (await rl.question("Email: ")).trim().toLowerCase();
  const password = await askHidden("Password (hidden, min 12 characters): ");
  const confirm = await askHidden("Confirm password: ");
  rl.close();

  if (name.length < 2) throw new Error("Please enter a name with at least 2 characters.");
  if (!emailPattern.test(email)) throw new Error("Please enter a valid email address.");
  if (password.length < 12) throw new Error("Password must be at least 12 characters.");
  if (password !== confirm) throw new Error("Passwords do not match.");

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000 });

  const existing = await User.findOne({ email }).select("+passwordHash").lean();
  if (existing) throw new Error(`An account already exists for ${email}.`);

  const adminCount = await User.countDocuments({ role: "admin" });
  const passwordHash = await bcrypt.hash(password, 12);

  await User.create({ name, email, role: "admin", status: "active", passwordHash, permissions: ["all"] });

  console.log(`\nAdministrator created: ${name} <${email}>`);
  if (adminCount === 0) console.log("This is the first administrator account.");
  console.log("Sign in at /admin/login with the password you just entered.\n");

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(`\nCould not create the administrator: ${error instanceof Error ? error.message : String(error)}\n`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
