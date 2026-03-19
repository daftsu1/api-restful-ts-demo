import { DoctorController } from '@modules/doctors/doctor.controller'
import type { IDoctorService } from '@interfaces/IDoctorService'

function mockRes() {
  const res: any = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

const doc = { _id: 'd1', name: 'Dr. House', role: 'doctor', specialty: 'general' }

describe('DoctorController (unitario)', () => {
  test('list sin specialty → llama listDoctors(undefined)', async () => {
    const svc: IDoctorService = {
      listDoctors: jest.fn().mockResolvedValue([doc]),
      getAvailableSlots: jest.fn()
    }
    const ctrl = new DoctorController(svc)
    const req = { user: { id: 'u1', role: 'patient' }, query: {} } as any
    const res = mockRes()
    await ctrl.list(req, res)
    expect(svc.listDoctors).toHaveBeenCalledWith(undefined)
    expect(res.status).toHaveBeenCalledWith(200)
  })

  test('list con specialty → filtra', async () => {
    const svc: IDoctorService = {
      listDoctors: jest.fn().mockResolvedValue([]),
      getAvailableSlots: jest.fn()
    }
    const ctrl = new DoctorController(svc)
    const req = { user: { id: 'u1', role: 'patient' }, query: { specialty: 'cardiology' } } as any
    const res = mockRes()
    await ctrl.list(req, res)
    expect(svc.listDoctors).toHaveBeenCalledWith('cardiology')
  })

  test('slots → pasa doctorId y date', async () => {
    const svc: IDoctorService = {
      listDoctors: jest.fn(),
      getAvailableSlots: jest.fn().mockResolvedValue(['07:00', '07:30'])
    }
    const ctrl = new DoctorController(svc)
    const req = { user: { id: 'u1' }, params: { id: 'd1' }, query: { date: '2099-01-01' } } as any
    const res = mockRes()
    await ctrl.slots(req, res)
    expect(svc.getAvailableSlots).toHaveBeenCalledWith('d1', '2099-01-01')
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: ['07:00', '07:30']
    }))
  })
})
