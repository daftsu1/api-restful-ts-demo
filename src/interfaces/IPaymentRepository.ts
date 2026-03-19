import type { IRepository } from '@interfaces/IRepository'
import type { IPayment } from '@interfaces/IPayment'

export interface IPaymentRepository extends IRepository<IPayment> {
  findByAppointmentId(appointmentId: string): Promise<IPayment | null>
  findByStripePaymentIntentId(stripePaymentIntentId: string): Promise<IPayment | null>
}

