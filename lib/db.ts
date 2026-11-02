import mongoose from "mongoose";

const globalForMongoose = global as typeof globalThis & { mongooseConnection?: Promise<typeof mongoose> };

export async function connectToDatabase() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured.");
  if (!globalForMongoose.mongooseConnection) globalForMongoose.mongooseConnection = mongoose.connect(process.env.MONGODB_URI);
  return globalForMongoose.mongooseConnection;
}
