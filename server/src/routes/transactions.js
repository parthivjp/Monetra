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
  let year
  let month
  let day

  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim())) {
    const isoDate = String(value).trim().slice(0, 10).split('-').map(Number)
    year = isoDate[0]
    month = isoDate[1]
    day = isoDate[2]
  } else if (value instanceof Date && !Number.isNaN(value.getTime())) {
    year = value.getUTCFullYear()
    month = value.getUTCMonth() + 1
    day = value.getUTCDate()
  } else if (/^\d{4}-/.test(String(value || ''))) {
    const date = new Date(String(value))
    if (Number.isNaN(date.getTime())) return ''
    year = date.getUTCFullYear()
    month = value instanceof Date ? date.getUTCMonth() + 1 : Number(String(value).slice(5, 7))
    day = value instanceof Date ? date.getUTCDate() : Number(String(value).slice(8, 10))
  } else {
    return ''
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) return ''
  return `${String(day).padStart(2, '0')}-${monthNames[month - 1]}-${String(year).slice(-2)}`
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
    const pageWidth = 515
    const left = 40
    const exportedAt = new Date()
    const money = (value) => `INR ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    const totalIncome = transactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const totalExpense = transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const net = totalIncome - totalExpense

    const drawPageFooter = (pageNumber) => {
      doc.save()
      doc.moveTo(left, 796).lineTo(left + pageWidth, 796).strokeColor('#e5e7eb').lineWidth(0.7).stroke()
      doc.font('Helvetica').fontSize(8).fillColor('#6b7280')
      doc.text('Monetra Personal Finance', left, 805, { width: 180 })
      doc.text(`Page ${pageNumber}`, left + 390, 805, { width: 125, align: 'right' })
      doc.restore()
    }

    let pageNumber = 1
    doc.rect(0, 0, 595, 68).fill('#657c5c')
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#ffffff')
    doc.text('MONETRA', left, 20, { width: 180 })
    doc.font('Helvetica').fontSize(10).fillColor('#eef4ea')
    doc.text('TRANSACTION REPORT', left + 330, 28, { width: 185, align: 'right' })

    doc.font('Helvetica-Bold').fontSize(16).fillColor('#1f2937')
    doc.text('Transactions', left, 88)
    doc.font('Helvetica').fontSize(9).fillColor('#6b7280')
    doc.text(`Generated ${exportedAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`, left, 110)

    const cardY = 132
    const cardWidth = 163
    const cardGap = 13
    const summaryCards = [
      { label: 'Transactions', value: String(transactions.length), color: '#657c5c' },
      { label: 'Income', value: money(totalIncome), color: '#3f7d5b' },
      { label: 'Expenses', value: money(totalExpense), color: '#b85c45' },
    ]
    summaryCards.forEach((card, index) => {
      const cardX = left + index * (cardWidth + cardGap)
      doc.roundedRect(cardX, cardY, cardWidth, 58, 7).fillAndStroke('#ffffff', '#dfe4da')
      doc.rect(cardX, cardY, 5, 58).fill(card.color)
      doc.font('Helvetica-Bold').fontSize(8).fillColor(card.color).text(card.label.toUpperCase(), cardX + 14, cardY + 11, { width: cardWidth - 24 })
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#1f2937').text(card.value, cardX + 14, cardY + 31, { width: cardWidth - 24, ellipsis: true })
    })

    let filterY = 204
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#657c5c')
    doc.text('APPLIED FILTERS', left, filterY)
    const filterParts = []
    if (req.query.type) filterParts.push(`Type: ${req.query.type === 'income' ? 'Income' : 'Expense'}`)
    if (req.query.category) filterParts.push(`Category: ${req.query.category}`)
    if (req.query.startDate) filterParts.push(`From: ${formatCsvDate(req.query.startDate)}`)
    if (req.query.search) filterParts.push(`Search: ${req.query.search}`)
    doc.font('Helvetica').fontSize(9).fillColor('#4b5563')
    doc.text(filterParts.length ? filterParts.join('   |   ') : 'All transactions', left, filterY + 15, { width: pageWidth })
    doc.font('Helvetica-Bold').fontSize(9).fillColor(net >= 0 ? '#3f7d5b' : '#b85c45')
    doc.text(`Net balance: ${money(net)}`, left, filterY + 34, { width: pageWidth, align: 'right' })

    const columns = [
      { label: 'DATE', width: 72, value: (item) => formatCsvDate(item.date) },
      { label: 'TYPE', width: 58, value: (item) => item.type === 'income' ? 'Income' : 'Expense' },
      { label: 'CATEGORY', width: 93, value: (item) => item.category },
      { label: 'NOTE', width: 190, value: (item) => item.note || '-' },
      { label: 'AMOUNT', width: 102, value: (item) => `${item.type === 'income' ? '+' : '-'} ${money(item.amount).replace('INR ', '')}` },
    ]
    let y = 260
    const drawTableHeader = () => {
      doc.rect(left, y, pageWidth, 28).fill('#4f5f48')
      let x = left
      columns.forEach((column) => {
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff')
        doc.text(column.label, x + 7, y + 9, {
          width: column.width - 14,
          height: 12,
          lineBreak: false,
          align: column.label === 'AMOUNT' ? 'right' : 'left',
        })
        x += column.width
      })
      y += 28
    }

    drawTableHeader()
    if (!transactions.length) {
      doc.roundedRect(left, y, pageWidth, 54, 6).fillAndStroke('#fafaf7', '#dfe4da')
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#657c5c')
      doc.text('No transactions match the selected filters.', left, y + 21, { width: pageWidth, align: 'center' })
      y += 54
    } else {
      transactions.forEach((item, index) => {
        const values = columns.map((column) => column.value(item))
        doc.font('Helvetica').fontSize(8.5).fillColor('#1f2937')
        const heights = values.map((value, columnIndex) =>
          doc.heightOfString(value, { width: columns[columnIndex].width - 14 }),
        )
        const rowHeight = Math.max(34, ...heights.map((height) => height + 16))
        if (y + rowHeight > 780) {
          drawPageFooter(pageNumber)
          doc.addPage()
          pageNumber += 1
          y = 50
          drawTableHeader()
        }

        doc.rect(left, y, pageWidth, rowHeight).fill(index % 2 === 0 ? '#ffffff' : '#f5f7f2')
        doc.moveTo(left, y + rowHeight).lineTo(left + pageWidth, y + rowHeight).strokeColor('#e5e7eb').lineWidth(0.5).stroke()

        let x = left
        values.forEach((value, columnIndex) => {
          doc.font(columnIndex === 1 && item.type ? 'Helvetica-Bold' : 'Helvetica')
          doc.fontSize(8.5)
          if (columnIndex === 4) {
            doc.fillColor(item.type === 'income' ? '#3f7d5b' : '#b85c45')
          } else {
            doc.fillColor('#374151')
          }
          doc.text(value, x + 7, y + 9, {
            width: columns[columnIndex].width - 14,
            height: rowHeight - 18,
            align: columns[columnIndex].label === 'AMOUNT' ? 'right' : 'left',
          })
          x += columns[columnIndex].width
        })
        y += rowHeight
      })
    }
    drawPageFooter(pageNumber)
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
