import { Router } from 'express'
import { z } from 'zod'
import Budget from '../models/Budget.js'
import { requireAuth } from '../middleware.js'

const router = Router()
router.use(requireAuth)

const budgetsSchema = z.object({
  budgets: z.array(z.object({
    category: z.string().trim().min(1).max(40),
    limit: z.coerce.number().min(0).max(1000000000),
  })).max(50).refine((budgets) => new Set(budgets.map(({ category }) => category)).size === budgets.length, 'Budget categories must be unique.'),
})

router.get('/', async (req, res, next) => {
  try {
    const budgets = await Budget.find({ user: req.userId }).sort({ category: 1 }).lean()
    res.json({ budgets })
  } catch (error) { next(error) }
})

router.put('/', async (req, res, next) => {
  try {
    const { budgets } = budgetsSchema.parse(req.body)
    await Promise.all(budgets.map(({ category, limit }) =>
      Budget.findOneAndUpdate(
        { user: req.userId, category },
        { user: req.userId, category, limit },
        { upsert: true, new: true, runValidators: true },
      ),
    ))
    const saved = await Budget.find({ user: req.userId }).sort({ category: 1 }).lean()
    res.json({ budgets: saved })
  } catch (error) { next(error) }
})

export default router
