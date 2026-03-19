import type { IPayment } from '@interfaces/IPayment'

export interface PayWithStripeResult {
  payment: IPayment
  message: string
}

export interface IPaymentService {
  /** Cobra la cita vía Stripe (test: confirma con tarjeta prueba en el mismo paso). Requiere sk_test_. */
  payWithStripe(appointmentId: string, patientId: string): Promise<PayWithStripeResult>
}
