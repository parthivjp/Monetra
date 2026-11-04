import mongoose from 'mongoose'

const budgetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  category: { type: String, required: true, trim: true, maxlength: 40 },
  limit: { type: Number, required: true, min: 0, max: 1000000000 },
}, { timestamps: true })

budgetSchema.index({ user: 1, category: 1 }, { unique: true })

export default mongoose.model('Budget', budgetSchema)
