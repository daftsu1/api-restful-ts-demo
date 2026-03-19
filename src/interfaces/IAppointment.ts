import type { IUser } from '@interfaces/IUser'
import type { IPayment } from '@interfaces/IPayment'

export type AppointmentStatus = 'PENDING' | 'PAID' | 'CONFIRMED' | 'REJECTED' | 'COMPLETED'

export interface IAppointment {
  _id: string
  patientId: string | IUser
  doctorId: string | IUser
  date: string
  slot: string
  status: AppointmentStatus
  paymentId?: string | IPayment
  reason?: string
  notes?: string
  createdAt: Date
}

