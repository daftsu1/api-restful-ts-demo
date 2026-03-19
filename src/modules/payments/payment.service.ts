import type { IPaymentService, PayWithStripeResult } from '@interfaces/IPaymentService'
import type { IPaymentRepository } from '@interfaces/IPaymentRepository'
import type { IAppointmentRepository } from '@interfaces/IAppointmentRepository'
import { AppError } from '@utils/AppError'
import { getStripeClient } from '@config/stripe'
import Stripe from 'stripe'

export class PaymentService implements IPaymentService {
  constructor(
    private readonly paymentRepo: IPaymentRepository,
    private readonly appointmentRepo: IAppointmentRepository
  ) {}

  private appointmentIdString(appointmentId: unknown): string {
    if (typeof appointmentId === 'string') return appointmentId
    if (appointmentId && typeof appointmentId === 'object' && '_id' in appointmentId) {
      return String((appointmentId as { _id: unknown })._id)
    }
    return String(appointmentId)
  }

  async handleStripePaymentIntentSucceeded(stripePaymentIntentId: string): Promise<void> {
    const payment = await this.paymentRepo.findByStripePaymentIntentId(stripePaymentIntentId)
    if (!payment) return

    if (payment.status === 'COMPLETED') return

    await this.paymentRepo.updateById(payment._id, { status: 'COMPLETED' })

    const aptId = this.appointmentIdString(payment.appointmentId)
    const appointment = await this.appointmentRepo.findById(aptId)
    if (appointment && appointment.status === 'PENDING') {
      await this.appointmentRepo.updateById(aptId, {
        status: 'PAID',
        paymentId: payment._id
      })
    }
  }

  private async createPaymentIntentRecord(
    appointmentId: string,
    patientId: string
  ): Promise<{ stripePaymentIntentId: string; paymentId: string }> {
    const appointment = await this.appointmentRepo.findById(appointmentId)
    if (!appointment) throw new AppError('Cita no encontrada', 404)
    if (appointment.patientId.toString() !== patientId) throw new AppError('No tienes permiso sobre esta cita', 403)
    if (appointment.status !== 'PENDING') throw new AppError('La cita ya fue pagada o no está pendiente de pago', 400)

    const stripe = getStripeClient()
    const amount = 5000
    const currency = 'usd'

    const intent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: { appointmentId },
      // Sin front: no podemos usar métodos que redirigen (sin return_url pero en un caso real se usaria para redirigir al usuario a la pagina de pago)
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      }
    })

    const payment = await this.paymentRepo.create({
      appointmentId,
      stripePaymentIntentId: intent.id,
      amount,
      currency,
      status: 'PENDING'
    })

    return { stripePaymentIntentId: intent.id, paymentId: payment._id }
  }

  private assertStripeTestMode(): void {
    // Jest pone NODE_ENV=test y Stripe está mockeado: no exigir clave en el repo
    if (process.env.NODE_ENV === 'test') {
      return
    }
    const sk = process.env.STRIPE_SECRET_KEY ?? ''
    if (!sk.startsWith('sk_test_')) {
      throw new AppError('Pagos: usar STRIPE_SECRET_KEY de prueba (sk_test_...)', 403)
    }
    const isProd = process.env.NODE_ENV === 'production'
    if (isProd && process.env.ALLOW_SERVER_CONFIRM_TEST_PAYMENT !== 'true') {
      throw new AppError(
        'Endpoint de pago test desactivado en producción. Usá ALLOW_SERVER_CONFIRM_TEST_PAYMENT=true solo en staging.',
        403
      )
    }
  }

  private async confirmIntentWithTestCard(
    patientId: string,
    stripePaymentIntentId: string
  ): Promise<PayWithStripeResult> {
    const payment = await this.paymentRepo.findByStripePaymentIntentId(stripePaymentIntentId)
    if (!payment) throw new AppError('Pago no registrado', 500)

    const aptId = this.appointmentIdString(payment.appointmentId)
    const appointment = await this.appointmentRepo.findById(aptId)
    if (!appointment) throw new AppError('Cita no encontrada', 404)
    if (appointment.patientId.toString() !== patientId) {
      throw new AppError('No tienes permiso sobre este pago', 403)
    }

    const stripe = getStripeClient()

    if (payment.status === 'COMPLETED') {
      const p = await this.paymentRepo.findById(payment._id)
      return { payment: p!, message: 'La cita ya estaba pagada' }
    }

    try {
      const intent = await stripe.paymentIntents.confirm(stripePaymentIntentId, {
        payment_method: 'pm_card_visa'
      })

      if (intent.status === 'succeeded') {
        await this.handleStripePaymentIntentSucceeded(stripePaymentIntentId)
        const updated = await this.paymentRepo.findById(payment._id)
        if (!updated) throw new AppError('No se pudo leer el pago', 500)
        return { payment: updated, message: 'Pago registrado; cita en estado PAID' }
      }

      if (intent.status === 'requires_action') {
        throw new AppError('Stripe requirió un paso extra (3DS); este flujo no lo cubre.', 400)
      }

      throw new AppError(`No se pudo completar el pago (estado: ${intent.status})`, 400)
    } catch (err) {
      if (err instanceof AppError) throw err
      if (err instanceof Stripe.errors.StripeError) {
        throw new AppError(`Stripe: ${err.message}`, 400)
      }
      throw err
    }
  }

  async payWithStripe(appointmentId: string, patientId: string): Promise<PayWithStripeResult> {
    this.assertStripeTestMode()
    const { stripePaymentIntentId } = await this.createPaymentIntentRecord(appointmentId, patientId)
    return this.confirmIntentWithTestCard(patientId, stripePaymentIntentId)
  }
}
