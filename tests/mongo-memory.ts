import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

let mongoServer: MongoMemoryServer | null = null

export async function connectTestDb(): Promise<void> {
  if (!mongoServer) {
    mongoServer = await MongoMemoryServer.create()
  }
  const uri = mongoServer.getUri()
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri)
  }
}

export async function disconnectTestDb(): Promise<void> {
  await mongoose.disconnect()
  if (mongoServer) {
    await mongoServer.stop()
    mongoServer = null
  }
}
