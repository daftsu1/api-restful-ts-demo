import { PaymentService } from '@modules/payments/payment.service'
import type { IPaymentRepository } from '@interfaces/IPaymentRepository'
import type { IAppointmentRepository } from '@interfaces/IAppointmentRepository'

describe('PaymentService (marcar pago completado)', () => {
  test('handleStripePaymentIntentSucceeded actualiza pago y cita PENDING → PAID', async () => {
    const payment = {
      _id: 'pay1',
      appointmentId: 'apt1',
      stripePaymentIntentId: 'pi_x',
      status: 'PENDING' as const
    }
    const appointment = {
      _id: 'apt1',
      patientId: 'p1',
      doctorId: 'd1',
      status: 'PENDING' as const
    }

    const paymentRepo: Partial<IPaymentRepository> = {
      findByStripePaymentIntentId: jest.fn().mockResolvedValue(payment),
      updateById: jest.fn().mockResolvedValue({ ...payment, status: 'COMPLETED' })
    }
    const appointmentRepo: Partial<IAppointmentRepository> = {
      findById: jest.fn().mockResolvedValue(appointment),
      updateById: jest.fn().mockResolvedValue({ ...appointment, status: 'PAID' })
    }

    const svc = new PaymentService(paymentRepo as IPaymentRepository, appointmentRepo as IAppointmentRepository)
    await svc.handleStripePaymentIntentSucceeded('pi_x')

    expect(paymentRepo.updateById).toHaveBeenCalledWith('pay1', { status: 'COMPLETED' })
    expect(appointmentRepo.updateById).toHaveBeenCalledWith('apt1', { status: 'PAID', paymentId: 'pay1' })
  })
})
