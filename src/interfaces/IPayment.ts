import type { IAppointment } from '@interfaces/IAppointment'

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED'

export interface IPayment {
  _id: string
  appointmentId: string | IAppointment
  stripePaymentIntentId: string
  amount: number
  currency: string
  status: PaymentStatus
  createdAt: Date
}

