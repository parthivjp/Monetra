import mongoose from 'mongoose'

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  category: { type: String, required: true, trim: true, maxlength: 40 },
  amount: { type: Number, required: true, min: 0.01, max: 1000000000 },
  date: {
    type: String,
    required: true,
    validate: {
      validator(value) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
        const [year, month, day] = value.split('-').map(Number)
        const date = new Date(year, month - 1, day)
        return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
      },
      message: 'Enter a valid date.',
    },
  },
  note: { type: String, trim: true, maxlength: 500, default: '' },
}, { timestamps: true })

transactionSchema.index({ user: 1, date: -1 })

export default mongoose.model('Transaction', transactionSchema)
