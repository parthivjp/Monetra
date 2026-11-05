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
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
}
app.disable('x-powered-by')
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({
  origin(origin, callback) {
    const allowed = (process.env.CLIENT_URL || 'http://localhost:5173,http://localhost:5174')
      .split(',')
      .map((value) => value.trim().replace(/\/$/, ''))
      .filter(Boolean)
    if (!origin || allowed.includes(origin)) return callback(null, true)
    if (process.env.NODE_ENV !== 'production') {
      try {
        const url = new URL(origin)
        if (['localhost', '127.0.0.1'].includes(url.hostname) && ['http:', 'https:'].includes(url.protocol)) {
          return callback(null, true)
        }
      } catch {}
    }
    const error = new Error('Origin is not allowed by CORS policy.')
    error.status = 403
    error.code = 'CORS_ORIGIN_NOT_ALLOWED'
    return callback(error)
  },
  credentials: true,
}))
app.use(express.json({ limit: '100kb' }))

app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  database: process.env.DB_NAME || 'ledgerly_finance',
  port: Number(process.env.PORT) || 5000,
}))
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

const PORT = Number(process.env.PORT) || 5000

await connectDatabase()
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Monetra API listening on http://0.0.0.0:${PORT}`)
})

async function shutdown() {
  server.close(async () => {
    await disconnectDatabase()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
