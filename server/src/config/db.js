import mongoose from 'mongoose'

export async function connectDatabase() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017'
  console.log(`MongoDB: connecting to database ${(process.env.DB_NAME || 'ledgerly_finance')}`)

  mongoose.set('strictQuery', true)
  await mongoose.connect(uri, {
    dbName: process.env.DB_NAME || 'ledgerly_finance',
  })
}

export async function disconnectDatabase() {
  await mongoose.disconnect()
}
