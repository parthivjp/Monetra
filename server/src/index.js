import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import authRoutes from './routes/auth.js'
import transactionRoutes from './routes/transactions.js'
import budgetRoutes from './routes/budgets.js'
import { connectDatabase, disconnectDatabase } from './config/db.js'
import { errorHandler, notFound } from './middleware.js'

const serverFolder = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(serverFolder, '../.env') })

const app = express()
app.disable('x-powered-by')
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({
  origin(origin, callback) {
    const allowed = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((value) => value.trim())
    if (!origin || allowed.includes(origin)) return callback(null, true)
    return callback(new Error('Origin is not allowed by CORS policy'))
  },
  credentials: true,
}))
app.use(express.json({ limit: '100kb' }))

app.get('/api/health', (req, res) => res.json({ status: 'ok', database: process.env.DB_NAME || 'ledgerly_finance' }))
app.use('/api/auth', authRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/budgets', budgetRoutes)
app.use(notFound)
app.use(errorHandler)

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production.')
  }
  process.env.JWT_SECRET = 'development-only-secret-change-before-production-32chars'
}

const port = Number(process.env.PORT) || 5000

await connectDatabase()
const server = app.listen(port, () => console.log(`Monetra API listening on http://localhost:${port}`))

async function shutdown() {
  server.close(async () => {
    await disconnectDatabase()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
