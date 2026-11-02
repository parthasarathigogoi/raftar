import mongoose from "mongoose";

/** Missing server configuration — a deployment fault, not a transient outage. */
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

const globalForMongoose = global as typeof globalThis & { mongooseConnection?: Promise<typeof mongoose> };

export async function connectToDatabase() {
  if (!process.env.MONGODB_URI) throw new ConfigurationError("MONGODB_URI is not configured.");
  if (!globalForMongoose.mongooseConnection) {
    globalForMongoose.mongooseConnection = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
    });
    // Do not cache a failed connection forever; allow the next request to retry.
    globalForMongoose.mongooseConnection.catch(() => {
      globalForMongoose.mongooseConnection = undefined;
    });
  }
  return globalForMongoose.mongooseConnection;
}
