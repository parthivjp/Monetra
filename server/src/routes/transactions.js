import { Router } from 'express'
import { z } from 'zod'
import mongoose from 'mongoose'
import PDFDocument from 'pdfkit'
import Transaction from '../models/Transaction.js'
import { requireAuth } from '../middleware.js'
import { getTransactionSummary } from '../controllers/transactions.js'

const router = Router()
router.use(requireAuth)

router.get('/summary', getTransactionSummary)

const transactionSchema = z.object({
  type: z.enum(['income', 'expense'], { error: 'Type must be income or expense.' }),
  category: z.string().trim().min(2, 'Category must be at least 2 characters.').max(40, 'Category must be at most 40 characters.').regex(/^[\p{L}\p{N} &/'-]+$/u, "Category can contain letters, numbers, spaces, hyphens, apostrophes, and &."),
  amount: z.coerce.number().positive('Amount must be greater than zero.').max(1000000000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date.').refine((value) => {
    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  }, 'Enter a valid date.'),
  note: z.string().trim().max(500, 'Note must be at most 500 characters.').optional().default(''),
})

router.get('/', async (req, res, next) => {
  try {
    const { type, category, startDate } = req.query
    const filter = { user: req.userId }
    if (['income', 'expense'].includes(type)) filter.type = type
    if (category) filter.category = category
    if (startDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Enter a valid start date.', fieldErrors: { startDate: 'Enter a valid date.' } } })
      const [year, month, day] = startDate.split('-').map(Number)
      const parsedDate = new Date(year, month - 1, day)
      if (parsedDate.getFullYear() !== year || parsedDate.getMonth() !== month - 1 || parsedDate.getDate() !== day) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Enter a valid start date.', fieldErrors: { startDate: 'Enter a valid date.' } } })
      }
      filter.date = { $gte: startDate }
    }
    const transactions = await Transaction.find(filter).sort({ date: -1, createdAt: -1 }).lean()
    res.json({ transactions })
  } catch (error) { next(error) }
})

const isValidIsoDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

const buildExportFilter = (req) => {
  const filter = { user: req.userId }
  const { type, category, startDate, search } = req.query
  if (['income', 'expense'].includes(type)) filter.type = type
  if (category) filter.category = category
  if (startDate) {
    if (!isValidIsoDate(startDate)) {
      const error = new Error('Enter a valid start date.')
      error.status = 400
      error.code = 'VALIDATION_ERROR'
      error.fieldErrors = { startDate: 'Enter a valid date.' }
      throw error
    }
    filter.date = { $gte: startDate }
  }
  if (search?.trim()) {
    const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    filter.$or = [
      { note: { $regex: safeSearch, $options: 'i' } },
      { category: { $regex: safeSearch, $options: 'i' } },
    ]
  }
  return filter
}

const escapeCsvCell = (value) => {
  let text = String(value ?? '')
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

const formatCsvDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return ''
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

router.get('/export/csv', async (req, res, next) => {
  try {
    const transactions = await Transaction.find(buildExportFilter(req)).sort({ date: -1, createdAt: -1 }).lean()
    const rows = [
      ['Date', 'Type', 'Category', 'Note', 'Amount'],
      ...transactions.map((item) => [
        formatCsvDate(item.date),
        item.type === 'income' ? 'Income' : 'Expense',
        item.category,
        item.note || '',
        Number(item.amount).toFixed(2),
      ]),
    ]
    const csv = '\ufeff' + rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="monetra-transactions.csv"')
    res.send(csv)
  } catch (error) { next(error) }
})

router.get('/export/pdf', async (req, res, next) => {
  try {
    const transactions = await Transaction.find(buildExportFilter(req)).sort({ date: -1, createdAt: -1 }).lean()
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="monetra-transactions.pdf"')

    const doc = new PDFDocument({ margin: 40, size: 'A4' })
    doc.pipe(res)
    doc.fontSize(20).text('Monetra Transactions', { align: 'center' })
    doc.moveDown(0.5)
    doc.fontSize(10).text(`Exported ${new Date().toLocaleDateString('en-IN')}`)
    doc.moveDown()

    if (!transactions.length) {
      doc.text('No transactions found.')
    } else {
      const columns = [
        { label: 'Date', width: 78, value: (item) => formatCsvDate(item.date) },
        { label: 'Type', width: 58, value: (item) => item.type === 'income' ? 'Income' : 'Expense' },
        { label: 'Category', width: 94, value: (item) => item.category },
        { label: 'Note', width: 195, value: (item) => item.note || '-' },
        { label: 'Amount', width: 85, value: (item) => `${item.type === 'income' ? '+' : '-'} INR ${Number(item.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` },
      ]
      let y = doc.y
      const drawHeader = () => {
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff')
        doc.rect(40, y, 510, 24).fill('#4f46e5')
        let x = 40
        for (const column of columns) {
          doc.text(column.label, x + 4, y + 7, { width: column.width - 8, height: 14, lineBreak: false })
          x += column.width
        }
        y += 24
      }
      drawHeader()

      transactions.forEach((item, index) => {
        const values = columns.map((column) => column.value(item))
        doc.font('Helvetica').fontSize(8.5).fillColor('#111827')
        const heights = values.map((value, columnIndex) =>
          doc.heightOfString(value, { width: columns[columnIndex].width - 8 }),
        )
        const rowHeight = Math.max(30, ...heights.map((height) => height + 12))
        if (y + rowHeight > 802) {
          doc.addPage()
          y = 50
          drawHeader()
        }
        let x = 40
        if (index % 2 === 1) doc.rect(40, y, 510, rowHeight).fill('#f3f4f6')
        doc.fillColor('#111827')
        values.forEach((value, columnIndex) => {
          doc.text(value, x + 4, y + 6, { width: columns[columnIndex].width - 8, height: rowHeight - 12 })
          x += columns[columnIndex].width
        })
        y += rowHeight
      })
    }
    doc.end()
  } catch (error) { next(error) }
})

router.post('/', async (req, res, next) => {
  try {
    const data = transactionSchema.parse(req.body)
    const transaction = await Transaction.create({ ...data, user: req.userId })
    res.status(201).json({ transaction })
  } catch (error) { next(error) }
})

router.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Transaction not found.', fieldErrors: {} } })
    }
    const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.userId })
    if (!transaction) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Transaction not found.', fieldErrors: {} } })
    res.json({ message: 'Transaction deleted.' })
  } catch (error) { next(error) }
})

router.put('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Transaction not found.', fieldErrors: {} } })
    }
    const data = transactionSchema.parse(req.body)
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      data,
      { new: true, runValidators: true },
    )
    if (!transaction) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Transaction not found.', fieldErrors: {} } })
    res.json({ transaction })
  } catch (error) { next(error) }
})

export default router
