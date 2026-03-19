import { Schema, model, type Document, type Types } from 'mongoose'
import type { IPayment, PaymentStatus } from '@interfaces/IPayment'

export interface PaymentDocument extends Omit<IPayment, '_id' | 'appointmentId' | 'createdAt'>, Document {
  appointmentId: Types.ObjectId
  status: PaymentStatus
}

const PaymentSchema = new Schema<PaymentDocument>(
  {
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true },
    stripePaymentIntentId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    status: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED'], required: true }
  },
  { timestamps: true }
)

export const PaymentModel = model<PaymentDocument>('Payment', PaymentSchema)

