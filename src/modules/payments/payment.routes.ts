import { Router } from 'express'
import { validateSchema } from '@middlewares/validateSchema.middleware'
import { authMiddleware } from '@middlewares/auth.middleware'
import { roleGuard } from '@middlewares/roleGuard.middleware'
import { PaymentController } from '@modules/payments/payment.controller'
import { PaymentService } from '@modules/payments/payment.service'
import { payWithStripeSchema } from '@modules/payments/payment.validator'
import { PaymentRepository } from '@modules/payments/payment.repository'
import { PaymentModel } from '@models/Payment.model'
import { AppointmentModel } from '@models/Appointment.model'
import { AppointmentRepository } from '@modules/appointments/appointment.repository'

export const paymentRouter = Router()

const paymentRepo = new PaymentRepository(PaymentModel)
const appointmentRepo = new AppointmentRepository(AppointmentModel)
const paymentService = new PaymentService(paymentRepo, appointmentRepo)
const paymentController = new PaymentController(paymentService)

paymentRouter.use(authMiddleware)

/**
 * @openapi
 * /api/payments/pay:
 *   post:
 *     summary: Pagar una cita con Stripe (modo test)
 *     description: |
 *       Único endpoint de pagos. Tras **crear la cita** (`POST /api/appointments`), llamá acá con su `appointmentId`.
 *       Crea el cobro en Stripe, confirma con tarjeta de prueba. Requiere `sk_test_`. Cita → **PAID**.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PayWithStripeRequest'
 *     responses:
 *       201:
 *         description: Pago OK; cita PAID
 *       400:
 *         description: Error de negocio o Stripe
 *       403:
 *         description: Clave no es sk_test_ o producción sin flag
 *       404:
 *         description: Cita no encontrada
 */
paymentRouter.post('/pay', roleGuard('patient'), validateSchema(payWithStripeSchema), paymentController.pay)
