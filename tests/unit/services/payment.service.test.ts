jest.mock('@config/stripe', () => {
  let pi = 0
  return {
    getStripeClient: () => ({
      paymentIntents: {
        create: jest.fn(async () => {
          pi += 1
          return { id: `pi_unit_${pi}`, client_secret: 'cs_unit' }
        }),
        confirm: jest.fn(async () => ({ status: 'succeeded' }))
      }
    })
  }
})

import { PaymentService } from '@modules/payments/payment.service'
import type { IPaymentRepository } from '@interfaces/IPaymentRepository'
import type { IAppointmentRepository } from '@interfaces/IAppointmentRepository'
import { AppError } from '@utils/AppError'

function makePaymentRepo(overrides: Partial<IPaymentRepository> = {}): IPaymentRepository {
  return {
    findById: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
    findByAppointmentId: jest.fn(),
    findByStripePaymentIntentId: jest.fn(),
    ...overrides
  }
}

function makeAppointmentRepo(overrides: Partial<IAppointmentRepository> = {}): IAppointmentRepository {
  return {
    findById: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
    findByDoctorAndSlot: jest.fn(),
    findByDoctorAndSlotExcludingId: jest.fn(),
    findByDoctor: jest.fn(),
    findByPatient: jest.fn(),
    findOccupiedSlots: jest.fn(),
    ...overrides
  }
}

describe('PaymentService (unitario)', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test'
  })

  describe('handleStripePaymentIntentSucceeded', () => {
    test('pago no encontrado → no hace nada', async () => {
      const payRepo = makePaymentRepo({ findByStripePaymentIntentId: jest.fn().mockResolvedValue(null) })
      const aptRepo = makeAppointmentRepo()
      const svc = new PaymentService(payRepo, aptRepo)
      await svc.handleStripePaymentIntentSucceeded('pi_unknown')
      expect(payRepo.updateById).not.toHaveBeenCalled()
      expect(aptRepo.findById).not.toHaveBeenCalled()
    })

    test('pago ya COMPLETED → no vuelve a actualizar', async () => {
      const pay = { _id: 'p1', appointmentId: 'a1', stripePaymentIntentId: 'pi_x', status: 'COMPLETED' as const }
      const payRepo = makePaymentRepo({ findByStripePaymentIntentId: jest.fn().mockResolvedValue(pay) })
      const aptRepo = makeAppointmentRepo()
      const svc = new PaymentService(payRepo, aptRepo)
      await svc.handleStripePaymentIntentSucceeded('pi_x')
      expect(payRepo.updateById).not.toHaveBeenCalled()
    })

    test('PENDING → marca COMPLETED y cita PAID', async () => {
      const pay = { _id: 'p1', appointmentId: 'a1', stripePaymentIntentId: 'pi_x', status: 'PENDING' as const }
      const apt = { _id: 'a1', patientId: 'u1', doctorId: 'd1', status: 'PENDING' as const }
      const payRepo = makePaymentRepo({
        findByStripePaymentIntentId: jest.fn().mockResolvedValue(pay),
        updateById: jest.fn().mockResolvedValue({ ...pay, status: 'COMPLETED' })
      })
      const aptRepo = makeAppointmentRepo({
        findById: jest.fn().mockResolvedValue(apt),
        updateById: jest.fn().mockResolvedValue({ ...apt, status: 'PAID' })
      })
      const svc = new PaymentService(payRepo, aptRepo)
      await svc.handleStripePaymentIntentSucceeded('pi_x')
      expect(payRepo.updateById).toHaveBeenCalledWith('p1', { status: 'COMPLETED' })
      expect(aptRepo.updateById).toHaveBeenCalledWith('a1', { status: 'PAID', paymentId: 'p1' })
    })

    test('cita ya PAID → no la vuelve a tocar', async () => {
      const pay = { _id: 'p1', appointmentId: 'a1', stripePaymentIntentId: 'pi_x', status: 'PENDING' as const }
      const apt = { _id: 'a1', patientId: 'u1', doctorId: 'd1', status: 'PAID' as const }
      const payRepo = makePaymentRepo({
        findByStripePaymentIntentId: jest.fn().mockResolvedValue(pay),
        updateById: jest.fn()
      })
      const aptRepo = makeAppointmentRepo({ findById: jest.fn().mockResolvedValue(apt) })
      const svc = new PaymentService(payRepo, aptRepo)
      await svc.handleStripePaymentIntentSucceeded('pi_x')
      expect(payRepo.updateById).toHaveBeenCalledWith('p1', { status: 'COMPLETED' })
      expect(aptRepo.updateById).not.toHaveBeenCalled()
    })
  })

  describe('payWithStripe', () => {
    test('cita no encontrada → 404', async () => {
      const payRepo = makePaymentRepo()
      const aptRepo = makeAppointmentRepo({ findById: jest.fn().mockResolvedValue(null) })
      const svc = new PaymentService(payRepo, aptRepo)
      await expect(svc.payWithStripe('a99', 'p1'))
        .rejects.toThrow(new AppError('Cita no encontrada', 404))
    })

    test('paciente distinto → 403', async () => {
      const apt = { _id: 'a1', patientId: 'p1', doctorId: 'd1', status: 'PENDING' as const }
      const payRepo = makePaymentRepo()
      const aptRepo = makeAppointmentRepo({ findById: jest.fn().mockResolvedValue(apt) })
      const svc = new PaymentService(payRepo, aptRepo)
      await expect(svc.payWithStripe('a1', 'otro'))
        .rejects.toThrow(new AppError('No tienes permiso sobre esta cita', 403))
    })

    test('cita no PENDING → 400', async () => {
      const apt = { _id: 'a1', patientId: 'p1', doctorId: 'd1', status: 'PAID' as const }
      const payRepo = makePaymentRepo()
      const aptRepo = makeAppointmentRepo({ findById: jest.fn().mockResolvedValue(apt) })
      const svc = new PaymentService(payRepo, aptRepo)
      await expect(svc.payWithStripe('a1', 'p1'))
        .rejects.toThrow(new AppError('La cita ya fue pagada o no está pendiente de pago', 400))
    })

    test('flujo completo: crea intent, confirma, actualiza DB', async () => {
      const apt = { _id: 'a1', patientId: 'p1', doctorId: 'd1', status: 'PENDING' as const }
      const createdPay = { _id: 'pay1', appointmentId: 'a1', stripePaymentIntentId: 'pi_unit_1', amount: 5000, currency: 'usd', status: 'PENDING' as const }
      const completedPay = { ...createdPay, status: 'COMPLETED' as const }

      const payRepo = makePaymentRepo({
        create: jest.fn().mockResolvedValue(createdPay),
        findByStripePaymentIntentId: jest.fn().mockResolvedValue(createdPay),
        updateById: jest.fn().mockResolvedValue(completedPay),
        findById: jest.fn().mockResolvedValue(completedPay)
      })
      const aptRepo = makeAppointmentRepo({
        findById: jest.fn().mockResolvedValue(apt),
        updateById: jest.fn().mockResolvedValue({ ...apt, status: 'PAID' })
      })
      const svc = new PaymentService(payRepo, aptRepo)
      const result = await svc.payWithStripe('a1', 'p1')
      expect(result.payment.status).toBe('COMPLETED')
      expect(result.message).toMatch(/Pago registrado/)
    })
  })
})
