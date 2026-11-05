import Transaction from '../models/Transaction.js'

const allowedRanges = new Set(['week', 'month', '3', '6', '12'])

function formatIsoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function getTransactionSummary(req, res, next) {
  try {
    const range = allowedRanges.has(req.query.range) ? req.query.range : 'week'
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let startDate
    let buckets

    if (range === 'week' || range === 'month') {
      const length = range === 'week' ? 7 : 30
      startDate = new Date(today)
      startDate.setDate(startDate.getDate() - (length - 1))
      buckets = Array.from({ length }, (_, index) => {
        const date = new Date(startDate)
        date.setDate(startDate.getDate() + index)
        const key = formatIsoDate(date)
        return {
          key,
          label: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          income: 0,
          expense: 0,
        }
      })
    } else {
      const length = Number(range)
      startDate = new Date(today.getFullYear(), today.getMonth() - (length - 1), 1)
      buckets = Array.from({ length }, (_, index) => {
        const date = new Date(startDate.getFullYear(), startDate.getMonth() + index, 1)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        return {
          key,
          label: date.toLocaleDateString('en-IN', {
            month: 'short',
            ...(length === 12 ? { year: '2-digit' } : {}),
          }),
          income: 0,
          expense: 0,
        }
      })
    }

    const startKey = formatIsoDate(startDate)
    const endKey = formatIsoDate(today)
    const transactions = await Transaction.find({
      user: req.userId,
      date: { $gte: startKey, $lte: endKey },
    }).select('type amount date').lean()

    const bucketByKey = new Map(buckets.map((bucket) => [bucket.key, bucket]))
    for (const transaction of transactions) {
      const amount = Number(transaction.amount)
      if (!Number.isFinite(amount) || amount <= 0) continue
      if (!['income', 'expense'].includes(transaction.type)) continue

      let key = transaction.date
      if (range !== 'week' && range !== 'month') key = transaction.date.slice(0, 7)
      const bucket = bucketByKey.get(key)
      if (bucket) bucket[transaction.type] += amount
    }

    res.json({
      summary: {
        range,
        period: range === 'week' ? 'daily' : range === 'month' ? 'daily' : 'monthly',
        startDate: startKey,
        endDate: endKey,
        buckets,
      },
    })
  } catch (error) {
    next(error)
  }
}
