jest.mock('@config/stripe', () => {
  let pi = 0
  return {
    getStripeClient: () => ({
      paymentIntents: {
        create: jest.fn(async () => {
          pi += 1
          return { id: `pi_mock_${pi}`, client_secret: 'cs_test' }
        }),
        confirm: jest.fn(async () => ({ status: 'succeeded' }))
      }
    })
  }
})

import request from 'supertest'
import { createApp } from '../src/app'
import { UserModel } from '@models/User.model'
import { AppointmentModel } from '@models/Appointment.model'
import { PaymentModel } from '@models/Payment.model'
import { connectTestDb, disconnectTestDb } from './mongo-memory'

async function registerAndLogin(app: ReturnType<typeof createApp>, role: 'patient' | 'doctor') {
  const email = `${role}_${Date.now()}@test.com`
  const base = {
    name: role === 'doctor' ? 'Dr. Test' : 'Paciente Test',
    email,
    password: 'Password1',
    role
  } as const

  const payload = role === 'doctor' ? { ...base, specialty: 'general' } : base
  await request(app).post('/api/auth/register').send(payload)

  const loginRes = await request(app).post('/api/auth/login').send({ email, password: 'Password1' })
  return { token: loginRes.body.data.token as string, email }
}

describe('Appointments', () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test_secret'
    await connectTestDb()
  })

  beforeEach(async () => {
    await PaymentModel.deleteMany({})
    await AppointmentModel.deleteMany({})
    await UserModel.deleteMany({})
  })

  afterAll(async () => {
    await disconnectTestDb()
  })

  test('Crear cita exitosa como patient', async () => {
    const app = createApp()
    const patient = await registerAndLogin(app, 'patient')
    const doctor = await registerAndLogin(app, 'doctor')

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient.token}`)
      .send({ doctorId: doctor.email, date: '2099-01-01', slot: '07:00', reason: 'Dolor' })

    const doctorDoc = await UserModel.findOne({ email: doctor.email }).exec()
    expect(doctorDoc).toBeTruthy()

    const res2 = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient.token}`)
      .send({ doctorId: doctorDoc!._id.toString(), date: '2099-01-01', slot: '07:00', reason: 'Dolor' })

    expect(res2.status).toBe(201)
    expect(res2.body.success).toBe(true)
    expect(res2.body.data.status).toBe('PENDING')
  })

  test('Crear cita en slot ocupado → 409', async () => {
    const app = createApp()
    const patient = await registerAndLogin(app, 'patient')
    const doctor = await registerAndLogin(app, 'doctor')
    const doctorDoc = await UserModel.findOne({ email: doctor.email }).exec()

    await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient.token}`)
      .send({ doctorId: doctorDoc!._id.toString(), date: '2099-01-01', slot: '07:00' })

    const res2 = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient.token}`)
      .send({ doctorId: doctorDoc!._id.toString(), date: '2099-01-01', slot: '07:00' })

    expect(res2.status).toBe(409)
  })

  test('Crear cita en horario inválido (13:00) → 400', async () => {
    const app = createApp()
    const patient = await registerAndLogin(app, 'patient')
    const doctor = await registerAndLogin(app, 'doctor')
    const doctorDoc = await UserModel.findOne({ email: doctor.email }).exec()

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient.token}`)
      .send({ doctorId: doctorDoc!._id.toString(), date: '2099-01-01', slot: '13:00' })

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('Slot inválido o fuera de horario')
  })

  test('Crear cita en fecha pasada → 400', async () => {
    const app = createApp()
    const patient = await registerAndLogin(app, 'patient')
    const doctor = await registerAndLogin(app, 'doctor')
    const doctorDoc = await UserModel.findOne({ email: doctor.email }).exec()

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient.token}`)
      .send({ doctorId: doctorDoc!._id.toString(), date: '2020-01-01', slot: '07:00' })

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('No se puede agendar en una fecha pasada')
  })

  test('Confirmar cita no pagada → 403', async () => {
    const app = createApp()
    const patient = await registerAndLogin(app, 'patient')
    const doctor = await registerAndLogin(app, 'doctor')
    const doctorDoc = await UserModel.findOne({ email: doctor.email }).exec()

    const createRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient.token}`)
      .send({ doctorId: doctorDoc!._id.toString(), date: '2099-01-01', slot: '07:00' })

    const appointmentId = createRes.body.data._id as string

    const res = await request(app)
      .patch(`/api/appointments/${appointmentId}/confirm`)
      .set('Authorization', `Bearer ${doctor.token}`)

    expect(res.status).toBe(403)
    expect(res.body.message).toBe('La cita no ha sido pagada')
  })

  test('Doctor intenta pedir cita → 403', async () => {
    const app = createApp()
    const doctor = await registerAndLogin(app, 'doctor')
    const anotherDoctor = await registerAndLogin(app, 'doctor')
    const anotherDoctorDoc = await UserModel.findOne({ email: anotherDoctor.email }).exec()

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${doctor.token}`)
      .send({ doctorId: anotherDoctorDoc!._id.toString(), date: '2099-01-01', slot: '07:00' })

    expect(res.status).toBe(403)
  })

  test('Reagendar cita PENDING a otro slot libre', async () => {
    const app = createApp()
    const patient = await registerAndLogin(app, 'patient')
    const doctor = await registerAndLogin(app, 'doctor')
    const doctorDoc = await UserModel.findOne({ email: doctor.email }).exec()
    const createRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient.token}`)
      .send({ doctorId: doctorDoc!._id.toString(), date: '2099-04-01', slot: '07:00' })
    const id = createRes.body.data._id as string

    const res = await request(app)
      .patch(`/api/appointments/${id}/reschedule`)
      .set('Authorization', `Bearer ${patient.token}`)
      .send({ date: '2099-04-01', slot: '08:00' })

    expect(res.status).toBe(200)
    expect(res.body.data.slot).toBe('08:00')
  })

  test('Reagendar a slot ocupado por otra cita → 409', async () => {
    const app = createApp()
    const patient = await registerAndLogin(app, 'patient')
    const patient2 = await registerAndLogin(app, 'patient')
    const doctor = await registerAndLogin(app, 'doctor')
    const doctorDoc = await UserModel.findOne({ email: doctor.email }).exec()
    await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient2.token}`)
      .send({ doctorId: doctorDoc!._id.toString(), date: '2099-05-01', slot: '09:00' })

    const createRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient.token}`)
      .send({ doctorId: doctorDoc!._id.toString(), date: '2099-05-01', slot: '07:00' })
    const id = createRes.body.data._id as string

    const res = await request(app)
      .patch(`/api/appointments/${id}/reschedule`)
      .set('Authorization', `Bearer ${patient.token}`)
      .send({ date: '2099-05-01', slot: '09:00' })

    expect(res.status).toBe(409)
  })

  test('Flujo pagar con Stripe (mock) → confirmar → completar', async () => {
    const app = createApp()
    const patient = await registerAndLogin(app, 'patient')
    const doctor = await registerAndLogin(app, 'doctor')
    const doctorDoc = await UserModel.findOne({ email: doctor.email }).exec()
    const createRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient.token}`)
      .send({ doctorId: doctorDoc!._id.toString(), date: '2099-06-01', slot: '07:00' })
    const id = createRes.body.data._id as string

    const payRes = await request(app)
      .post('/api/payments/pay')
      .set('Authorization', `Bearer ${patient.token}`)
      .send({ appointmentId: id })
    expect(payRes.status).toBe(201)

    await request(app).patch(`/api/appointments/${id}/confirm`).set('Authorization', `Bearer ${doctor.token}`)

    const res = await request(app)
      .patch(`/api/appointments/${id}/complete`)
      .set('Authorization', `Bearer ${doctor.token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('COMPLETED')
  })
})
