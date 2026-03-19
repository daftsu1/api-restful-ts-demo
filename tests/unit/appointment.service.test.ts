import { AppointmentService } from '@modules/appointments/appointment.service'
import type { IAppointmentRepository } from '@interfaces/IAppointmentRepository'
import type { IAppointment } from '@interfaces/IAppointment'
import { AppError } from '@utils/AppError'

function makeRepo(overrides: Partial<IAppointmentRepository> = {}): IAppointmentRepository {
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

const base: IAppointment = {
  _id: 'apt1',
  patientId: 'p1',
  doctorId: 'd1',
  date: '2099-01-01',
  slot: '07:00',
  status: 'PENDING',
  createdAt: new Date()
}

describe('AppointmentService (unitario)', () => {
  describe('createAppointment', () => {
    test('slot inválido → AppError 400', async () => {
      const repo = makeRepo()
      const svc = new AppointmentService(repo)
      await expect(svc.createAppointment('p1', { doctorId: 'd1', date: '2099-01-01', slot: '13:00' }))
        .rejects.toThrow(new AppError('Slot inválido o fuera de horario', 400))
      expect(repo.findByDoctorAndSlot).not.toHaveBeenCalled()
    })

    test('fecha pasada → AppError 400', async () => {
      const repo = makeRepo()
      const svc = new AppointmentService(repo)
      await expect(svc.createAppointment('p1', { doctorId: 'd1', date: '2020-01-01', slot: '07:00' }))
        .rejects.toThrow(new AppError('No se puede agendar en una fecha pasada', 400))
    })

    test('slot ocupado → AppError 409', async () => {
      const repo = makeRepo({
        findByDoctorAndSlot: jest.fn().mockResolvedValue(base)
      })
      const svc = new AppointmentService(repo)
      await expect(svc.createAppointment('p1', { doctorId: 'd1', date: '2099-01-01', slot: '07:00' }))
        .rejects.toThrow(new AppError('El horario ya está reservado', 409))
    })

    test('crea cita en PENDING si todo OK', async () => {
      const created = { ...base, _id: 'new1' }
      const repo = makeRepo({
        findByDoctorAndSlot: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(created)
      })
      const svc = new AppointmentService(repo)
      const result = await svc.createAppointment('p1', { doctorId: 'd1', date: '2099-01-01', slot: '07:00' })
      expect(result).toEqual(created)
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'PENDING' }))
    })
  })

  describe('confirmAppointment', () => {
    test('cita no encontrada → 404', async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) })
      const svc = new AppointmentService(repo)
      await expect(svc.confirmAppointment('apt1', 'd1'))
        .rejects.toThrow(new AppError('Cita no encontrada', 404))
    })

    test('doctor distinto → 403', async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue({ ...base, status: 'PAID' }) })
      const svc = new AppointmentService(repo)
      await expect(svc.confirmAppointment('apt1', 'otro_doctor'))
        .rejects.toThrow(new AppError('No tienes permiso sobre esta cita', 403))
    })

    test('cita no pagada → 403', async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue({ ...base, status: 'PENDING' }) })
      const svc = new AppointmentService(repo)
      await expect(svc.confirmAppointment('apt1', 'd1'))
        .rejects.toThrow(new AppError('La cita no ha sido pagada', 403))
    })

    test('confirma cita PAID → CONFIRMED', async () => {
      const confirmed = { ...base, status: 'CONFIRMED' as const }
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue({ ...base, status: 'PAID' }),
        updateById: jest.fn().mockResolvedValue(confirmed)
      })
      const svc = new AppointmentService(repo)
      const result = await svc.confirmAppointment('apt1', 'd1')
      expect(result.status).toBe('CONFIRMED')
      expect(repo.updateById).toHaveBeenCalledWith('apt1', { status: 'CONFIRMED' })
    })
  })

  describe('rejectAppointment', () => {
    test('cita no encontrada → 404', async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) })
      const svc = new AppointmentService(repo)
      await expect(svc.rejectAppointment('apt1', 'd1'))
        .rejects.toThrow(new AppError('Cita no encontrada', 404))
    })

    test('doctor distinto → 403', async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(base) })
      const svc = new AppointmentService(repo)
      await expect(svc.rejectAppointment('apt1', 'otro'))
        .rejects.toThrow(new AppError('No tienes permiso sobre esta cita', 403))
    })

    test('rechaza correctamente → REJECTED', async () => {
      const rejected = { ...base, status: 'REJECTED' as const }
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(base),
        updateById: jest.fn().mockResolvedValue(rejected)
      })
      const svc = new AppointmentService(repo)
      const result = await svc.rejectAppointment('apt1', 'd1')
      expect(result.status).toBe('REJECTED')
    })
  })

  describe('rescheduleAppointment', () => {
    test('estado REJECTED → no se puede reagendar', async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue({ ...base, status: 'REJECTED' }) })
      const svc = new AppointmentService(repo)
      await expect(svc.rescheduleAppointment('apt1', 'p1', { date: '2099-02-01', slot: '08:00' }))
        .rejects.toThrow(new AppError('No se puede reagendar esta cita en su estado actual', 400))
    })

    test('estado COMPLETED → no se puede reagendar', async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue({ ...base, status: 'COMPLETED' }) })
      const svc = new AppointmentService(repo)
      await expect(svc.rescheduleAppointment('apt1', 'p1', { date: '2099-02-01', slot: '08:00' }))
        .rejects.toThrow(new AppError('No se puede reagendar esta cita en su estado actual', 400))
    })

    test('paciente distinto → 403', async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(base) })
      const svc = new AppointmentService(repo)
      await expect(svc.rescheduleAppointment('apt1', 'otro_paciente', { date: '2099-02-01', slot: '08:00' }))
        .rejects.toThrow(new AppError('No tienes permiso sobre esta cita', 403))
    })

    test('conflicto de slot → 409', async () => {
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(base),
        findByDoctorAndSlotExcludingId: jest.fn().mockResolvedValue({ ...base, _id: 'otra' })
      })
      const svc = new AppointmentService(repo)
      await expect(svc.rescheduleAppointment('apt1', 'p1', { date: '2099-02-01', slot: '08:00' }))
        .rejects.toThrow(new AppError('El horario ya está reservado', 409))
    })

    test('reagenda OK con slot libre', async () => {
      const updated = { ...base, date: '2099-02-01', slot: '08:00' }
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(base),
        findByDoctorAndSlotExcludingId: jest.fn().mockResolvedValue(null),
        updateById: jest.fn().mockResolvedValue(updated)
      })
      const svc = new AppointmentService(repo)
      const result = await svc.rescheduleAppointment('apt1', 'p1', { date: '2099-02-01', slot: '08:00' })
      expect(result.date).toBe('2099-02-01')
      expect(result.slot).toBe('08:00')
      expect(repo.updateById).toHaveBeenCalledWith('apt1', { date: '2099-02-01', slot: '08:00' })
    })
  })

  describe('completeAppointment', () => {
    test('cita no CONFIRMED → 400', async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue({ ...base, status: 'PAID' }) })
      const svc = new AppointmentService(repo)
      await expect(svc.completeAppointment('apt1', 'd1'))
        .rejects.toThrow(new AppError('Solo se puede completar una cita confirmada', 400))
    })

    test('completa cita CONFIRMED → COMPLETED', async () => {
      const completed = { ...base, status: 'COMPLETED' as const }
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue({ ...base, status: 'CONFIRMED' }),
        updateById: jest.fn().mockResolvedValue(completed)
      })
      const svc = new AppointmentService(repo)
      const result = await svc.completeAppointment('apt1', 'd1')
      expect(result.status).toBe('COMPLETED')
    })
  })
})
