import mongoose from 'mongoose'

export async function connectDatabase(): Promise<void> {
  const mongoUri = process.env.MONGO_URI
  if (!mongoUri) {
    throw new Error('MONGO_URI no está configurada')
  }

  if (mongoose.connection.readyState === 1) return

  await mongoose.connect(mongoUri)
}

