import { AppointmentController } from '@modules/appointments/appointment.controller'
import type { IAppointmentService } from '@interfaces/IAppointmentService'

function mockRes() {
  const res: any = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

function mockReq(overrides: Record<string, unknown> = {}) {
  return { user: { id: 'u1', role: 'patient' }, body: {}, params: {}, query: {}, ...overrides } as any
}

function makeSvc(overrides: Partial<IAppointmentService> = {}): IAppointmentService {
  return {
    createAppointment: jest.fn(),
    confirmAppointment: jest.fn(),
    rejectAppointment: jest.fn(),
    rescheduleAppointment: jest.fn(),
    completeAppointment: jest.fn(),
    getTodayAppointments: jest.fn(),
    getMyAppointments: jest.fn(),
    ...overrides
  }
}

const apt = { _id: 'a1', status: 'PENDING' }

describe('AppointmentController (unitario)', () => {
  test('create → llama service.createAppointment y responde 201', async () => {
    const svc = makeSvc({ createAppointment: jest.fn().mockResolvedValue(apt) })
    const ctrl = new AppointmentController(svc)
    const req = mockReq({ body: { doctorId: 'd1', date: '2099-01-01', slot: '07:00' } })
    const res = mockRes()
    await ctrl.create(req, res)
    expect(svc.createAppointment).toHaveBeenCalledWith('u1', req.body)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: apt }))
  })

  test('mine → responde 200 con lista', async () => {
    const svc = makeSvc({ getMyAppointments: jest.fn().mockResolvedValue([apt]) })
    const ctrl = new AppointmentController(svc)
    const res = mockRes()
    await ctrl.mine(mockReq(), res)
    expect(svc.getMyAppointments).toHaveBeenCalledWith('u1')
    expect(res.status).toHaveBeenCalledWith(200)
  })

  test('today → responde 200', async () => {
    const svc = makeSvc({ getTodayAppointments: jest.fn().mockResolvedValue([]) })
    const ctrl = new AppointmentController(svc)
    const res = mockRes()
    await ctrl.today(mockReq(), res)
    expect(svc.getTodayAppointments).toHaveBeenCalledWith('u1')
    expect(res.status).toHaveBeenCalledWith(200)
  })

  test('confirm → pasa appointmentId y userId', async () => {
    const svc = makeSvc({ confirmAppointment: jest.fn().mockResolvedValue({ ...apt, status: 'CONFIRMED' }) })
    const ctrl = new AppointmentController(svc)
    const res = mockRes()
    await ctrl.confirm(mockReq({ params: { id: 'a1' } }), res)
    expect(svc.confirmAppointment).toHaveBeenCalledWith('a1', 'u1')
    expect(res.status).toHaveBeenCalledWith(200)
  })

  test('reject → pasa appointmentId y userId', async () => {
    const svc = makeSvc({ rejectAppointment: jest.fn().mockResolvedValue({ ...apt, status: 'REJECTED' }) })
    const ctrl = new AppointmentController(svc)
    const res = mockRes()
    await ctrl.reject(mockReq({ params: { id: 'a1' } }), res)
    expect(svc.rejectAppointment).toHaveBeenCalledWith('a1', 'u1')
  })

  test('reschedule → pasa id, userId y body', async () => {
    const body = { date: '2099-02-01', slot: '08:00' }
    const svc = makeSvc({ rescheduleAppointment: jest.fn().mockResolvedValue({ ...apt, ...body }) })
    const ctrl = new AppointmentController(svc)
    const res = mockRes()
    await ctrl.reschedule(mockReq({ params: { id: 'a1' }, body }), res)
    expect(svc.rescheduleAppointment).toHaveBeenCalledWith('a1', 'u1', body)
  })

  test('complete → pasa id y userId', async () => {
    const svc = makeSvc({ completeAppointment: jest.fn().mockResolvedValue({ ...apt, status: 'COMPLETED' }) })
    const ctrl = new AppointmentController(svc)
    const res = mockRes()
    await ctrl.complete(mockReq({ params: { id: 'a1' } }), res)
    expect(svc.completeAppointment).toHaveBeenCalledWith('a1', 'u1')
  })
})
