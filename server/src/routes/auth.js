import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import User from '../models/User.js'
import Transaction from '../models/Transaction.js'
import Budget from '../models/Budget.js'
import { authRateLimit, requireAuth } from '../middleware.js'

const router = Router()
const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address.').max(254)
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters.').max(72, 'Password must be at most 72 characters.').regex(/[a-z]/, 'Password must include a lowercase letter.').regex(/[A-Z]/, 'Password must include an uppercase letter.').regex(/\d/, 'Password must include a number.')

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80, 'Name must be at most 80 characters.'),
  email: emailSchema,
  password: passwordSchema,
})

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.').max(72),
})

function issueToken(user) {
  const token = jwt.sign({ sub: String(user._id) }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' })
  return token
}

router.post('/signup', authRateLimit(), async (req, res, next) => {
  try {
    const data = signupSchema.parse(req.body)
    const passwordHash = await bcrypt.hash(data.password, 12)
    const user = await User.create({ ...data, passwordHash })
    res.status(201).json({ token: issueToken(user), user: { id: user._id, name: user.name, email: user.email } })
  } catch (error) { next(error) }
})

router.post('/login', authRateLimit(), async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body)
    const user = await User.findOne({ email: data.email }).select('+passwordHash')
    if (!user || !(await user.comparePassword(data.password))) {
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.', fieldErrors: {} } })
    }
    res.json({ token: issueToken(user), user: { id: user._id, name: user.name, email: user.email } })
  } catch (error) { next(error) }
})

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId)
    if (!user) return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User account not found.', fieldErrors: {} } })
    res.json({ user: { id: user._id, name: user.name, email: user.email } })
  } catch (error) { next(error) }
})

router.put('/me', requireAuth, async (req, res, next) => {
  try {
    const data = z.object({
      name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80, 'Name must be at most 80 characters.'),
    }).parse(req.body)
    const user = await User.findByIdAndUpdate(req.userId, data, { new: true, runValidators: true })
    if (!user) return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User account not found.', fieldErrors: {} } })
    res.json({ user: { id: user._id, name: user.name, email: user.email } })
  } catch (error) { next(error) }
})

router.post('/demo', authRateLimit(), async (req, res, next) => {
  try {
    const email = 'demo@ledgerly.app'
    let user = await User.findOne({ email })
    if (!user) {
      user = await User.create({ name: 'Alex Morgan', email, passwordHash: await bcrypt.hash('Demo1234!', 12) })
      await Transaction.insertMany([
        { user: user._id, type: 'expense', category: 'Housing', amount: 18500, date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), note: 'Monthly rent' },
        { user: user._id, type: 'expense', category: 'Food', amount: 3250, date: new Date(Date.now() - 172800000).toISOString().slice(0, 10), note: 'D-Mart groceries' },
        { user: user._id, type: 'income', category: 'Salary', amount: 82500, date: new Date(Date.now() - 345600000).toISOString().slice(0, 10), note: 'Monthly salary' },
        { user: user._id, type: 'expense', category: 'Transport', amount: 1450, date: new Date(Date.now() - 518400000).toISOString().slice(0, 10), note: 'Metro pass' },
        { user: user._id, type: 'expense', category: 'Shopping', amount: 4200, date: new Date(Date.now() - 691200000).toISOString().slice(0, 10), note: 'Online shopping' },
      ])
      await Budget.insertMany([
        { user: user._id, category: 'Housing', limit: 22000 },
        { user: user._id, category: 'Food', limit: 10000 },
        { user: user._id, category: 'Transport', limit: 5000 },
        { user: user._id, category: 'Entertainment', limit: 4000 },
      ])
    }
    res.json({ token: issueToken(user), user: { id: user._id, name: user.name, email: user.email } })
  } catch (error) { next(error) }
})

export default router
