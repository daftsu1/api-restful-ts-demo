import { DoctorService } from '@modules/doctors/doctor.service'
import type { IUserRepository } from '@interfaces/IUserRepository'
import type { IAppointmentRepository } from '@interfaces/IAppointmentRepository'

function makeUserRepo(overrides: Partial<IUserRepository> = {}): IUserRepository {
  return {
    findById: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
    findByEmail: jest.fn(),
    findDoctors: jest.fn(),
    ...overrides
  }
}

function makeAptRepo(overrides: Partial<IAppointmentRepository> = {}): IAppointmentRepository {
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

const doc = { _id: 'd1', name: 'Dr. House', email: 'd@t.com', role: 'doctor' as const, specialty: 'general', password: 'x', createdAt: new Date(), comparePassword: jest.fn() }

describe('DoctorService (unitario)', () => {
  describe('listDoctors', () => {
    test('sin specialty → delega a findDoctors(undefined)', async () => {
      const userRepo = makeUserRepo({ findDoctors: jest.fn().mockResolvedValue([doc]) })
      const svc = new DoctorService(userRepo, makeAptRepo())
      const result = await svc.listDoctors()
      expect(userRepo.findDoctors).toHaveBeenCalledWith(undefined)
      expect(result).toEqual([doc])
    })

    test('con specialty → filtra', async () => {
      const userRepo = makeUserRepo({ findDoctors: jest.fn().mockResolvedValue([]) })
      const svc = new DoctorService(userRepo, makeAptRepo())
      await svc.listDoctors('cardiology')
      expect(userRepo.findDoctors).toHaveBeenCalledWith('cardiology')
    })
  })

  describe('getAvailableSlots', () => {
    test('sin ocupados → 18 slots', async () => {
      const aptRepo = makeAptRepo({ findOccupiedSlots: jest.fn().mockResolvedValue([]) })
      const svc = new DoctorService(makeUserRepo(), aptRepo)
      const slots = await svc.getAvailableSlots('d1', '2099-01-01')
      expect(aptRepo.findOccupiedSlots).toHaveBeenCalledWith('d1', '2099-01-01')
      expect(slots).toHaveLength(18)
    })

    test('con 2 ocupados → 16 slots', async () => {
      const aptRepo = makeAptRepo({ findOccupiedSlots: jest.fn().mockResolvedValue(['07:00', '07:30']) })
      const svc = new DoctorService(makeUserRepo(), aptRepo)
      const slots = await svc.getAvailableSlots('d1', '2099-01-01')
      expect(slots).toHaveLength(16)
      expect(slots).not.toContain('07:00')
    })
  })
})
