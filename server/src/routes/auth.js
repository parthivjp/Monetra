import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import User from '../models/User.js'
import { authRateLimit, requireAuth } from '../middleware.js'

const router = Router()
const emailSchema = z.string().trim().toLowerCase().max(254).email('Enter a valid email address.').refine((email) => {
  const [local, domain] = email.split('@')
  return local && domain && local.length <= 64 && !local.startsWith('.') && !local.endsWith('.') && !local.includes('..') && /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(domain)
}, 'Enter a complete email address with a valid domain.')
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters.').max(72, 'Password must be at most 72 characters.').regex(/[a-z]/, 'Password must include a lowercase letter.').regex(/[A-Z]/, 'Password must include an uppercase letter.').regex(/\d/, 'Password must include a number.')
const nameSchema = z.string().trim().min(2, 'Name must be at least 2 characters.').max(80, 'Name must be at most 80 characters.').regex(/^[\p{L} ]+$/u, 'Name can contain only letters and spaces.').refine((name) => name.replaceAll(' ', '').length >= 2, 'Name must contain at least 2 letters.')

const signupSchema = z.object({
  name: nameSchema,
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

async function validateEmailDomain(email) {
  const domain = email.split('@')[1]
  if (['gmail.com.co', 'gmail.cmo', 'gmail.con', 'gmail.om', 'hotmail.con', 'outlook.con', 'yahoo.con'].includes(domain)) return false
  if (domain === 'gmail.co') return false
  return true
}

router.post('/signup', authRateLimit(), async (req, res, next) => {
  try {
    const data = signupSchema.parse(req.body)
    if (!(await validateEmailDomain(data.email))) {
      return res.status(400).json({ error: { code: 'INVALID_EMAIL', message: 'This email domain does not accept mail. Check your email address.', fieldErrors: { email: 'Enter a real, working email address.' } } })
    }
    const passwordHash = await bcrypt.hash(data.password, 12)
    const user = await User.create({ ...data, passwordHash })
    res.status(201).json({
      message: 'Account created successfully. Please sign in.',
      user: { id: user._id, name: user.name, email: user.email },
    })
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
      name: nameSchema,
    }).parse(req.body)
    const user = await User.findByIdAndUpdate(req.userId, data, { new: true, runValidators: true })
    if (!user) return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User account not found.', fieldErrors: {} } })
    res.json({ user: { id: user._id, name: user.name, email: user.email } })
  } catch (error) { next(error) }
})

router.put('/password', requireAuth, async (req, res, next) => {
  try {
    const data = z.object({
      currentPassword: z.string().min(1, 'Current password is required.'),
      newPassword: passwordSchema,
    }).parse(req.body)
    const user = await User.findById(req.userId).select('+passwordHash')
    if (!user || !(await user.comparePassword(data.currentPassword))) {
      return res.status(401).json({ error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect.', fieldErrors: { currentPassword: 'Current password is incorrect.' } } })
    }
    user.passwordHash = await bcrypt.hash(data.newPassword, 12)
    await user.save()
    res.json({ message: 'Password updated successfully.' })
  } catch (error) { next(error) }
})

export default router
