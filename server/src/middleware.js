import jwt from 'jsonwebtoken'
import { ZodError } from 'zod'
import { rateLimit } from 'express-rate-limit'

export function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.', fieldErrors: {} } })
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET)
    req.userId = payload.sub
    return next()
  } catch {
    return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Your session is invalid or has expired. Please sign in again.', fieldErrors: {} } })
  }
}

export function authRateLimit() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many sign-in attempts. Please wait before trying again.', fieldErrors: {} } },
  })
}

export function notFound(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} was not found.`, fieldErrors: {} } })
}

export function errorHandler(error, req, res) {
  if (error?.code === 'CORS_ORIGIN_NOT_ALLOWED') {
    return res.status(403).json({
      error: {
        code: error.code,
        message: error.message,
        fieldErrors: {},
      },
    })
  }

  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: { code: 'INVALID_JSON', message: 'The request body contains invalid JSON.', fieldErrors: {} },
    })
  }

  if (error?.name === 'CastError') {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'The requested resource was not found.', fieldErrors: {} },
    })
  }

  if (error instanceof ZodError) {
    const fieldErrors = {}
    for (const issue of error.issues) fieldErrors[issue.path.join('.') || '_form'] = issue.message
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', fieldErrors },
    })
  }

  if (error?.name === 'MongoServerError' && error.code === 11000) {
    return res.status(409).json({
      error: { code: 'DUPLICATE_EMAIL', message: 'An account with this email address already exists.', fieldErrors: { email: 'Email address is already registered.' } },
    })
  }

  const status = error.status || 500
  console.error(error)
  return res.status(status).json({
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: status === 500 ? 'Something went wrong on the server. Please try again.' : error.message,
      fieldErrors: error.fieldErrors || {},
    },
  })
}
