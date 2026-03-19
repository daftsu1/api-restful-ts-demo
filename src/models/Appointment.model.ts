import { Schema, model, type Document, type Types } from 'mongoose'
import type { IAppointment, AppointmentStatus } from '@interfaces/IAppointment'

export interface AppointmentDocument extends Omit<IAppointment, '_id' | 'patientId' | 'doctorId' | 'paymentId' | 'createdAt'>, Document {
  patientId: Types.ObjectId
  doctorId: Types.ObjectId
  paymentId?: Types.ObjectId
  status: AppointmentStatus
}

const AppointmentSchema = new Schema<AppointmentDocument>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    slot: { type: String, required: true },
    status: { type: String, enum: ['PENDING', 'PAID', 'CONFIRMED', 'REJECTED', 'COMPLETED'], required: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    reason: { type: String, maxlength: 300 },
    notes: { type: String }
  },
  { timestamps: true }
)

AppointmentSchema.index({ doctorId: 1, date: 1, slot: 1 }, { unique: true })

export const AppointmentModel = model<AppointmentDocument>('Appointment', AppointmentSchema)

