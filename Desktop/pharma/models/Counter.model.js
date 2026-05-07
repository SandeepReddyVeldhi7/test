import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 }
});

/**
 * Get next sequential invoice number.
 * Format: INV-YYYY-XXXX (e.g. INV-2026-0001, INV-2026-0002)
 * Uses atomic findOneAndUpdate to prevent duplicates under concurrency.
 */
counterSchema.statics.getNextInvoiceNumber = async function () {
  const year = new Date().getFullYear();
  const counterName = `invoice_${year}`;

  const counter = await this.findOneAndUpdate(
    { name: counterName },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return `INV-${year}-${String(counter.seq).padStart(4, "0")}`;
};

export default mongoose.model("Counter", counterSchema);
