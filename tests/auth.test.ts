import request from 'supertest'
import { createApp } from '../src/app'
import { UserModel } from '@models/User.model'
import jwt from 'jsonwebtoken'
import { connectTestDb, disconnectTestDb } from './mongo-memory'

describe('Auth', () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test_secret'
    process.env.JWT_EXPIRES_IN = '8h'
    await connectTestDb()
  })

  beforeEach(async () => {
    await UserModel.deleteMany({})
  })

  afterAll(async () => {
    await disconnectTestDb()
  })

  test('Registro exitoso (patient)', async () => {
    const app = createApp()
    const res = await request(app).post('/api/auth/register').send({
      name: 'Juan',
      email: 'juan@test.com',
      password: 'Password1',
      role: 'patient'
    })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.email).toBe('juan@test.com')
    expect(res.body.data.password).toBeUndefined()
  })

  test('Registro exitoso (doctor con specialty)', async () => {
    const app = createApp()
    const res = await request(app).post('/api/auth/register').send({
      name: 'Dra. Ana',
      email: 'ana@test.com',
      password: 'Password1',
      role: 'doctor',
      specialty: 'cardiology'
    })

    expect(res.status).toBe(201)
    expect(res.body.data.role).toBe('doctor')
    expect(res.body.data.specialty).toBe('cardiology')
  })

  test('Registro con email duplicado → 409', async () => {
    const app = createApp()
    await request(app).post('/api/auth/register').send({
      name: 'Juan',
      email: 'dup@test.com',
      password: 'Password1',
      role: 'patient'
    })

    const res2 = await request(app).post('/api/auth/register').send({
      name: 'Juan 2',
      email: 'dup@test.com',
      password: 'Password1',
      role: 'patient'
    })

    expect(res2.status).toBe(409)
    expect(res2.body.success).toBe(false)
  })

  test('Login correcto → retorna JWT válido', async () => {
    const app = createApp()
    await request(app).post('/api/auth/register').send({
      name: 'Juan',
      email: 'login@test.com',
      password: 'Password1',
      role: 'patient'
    })

    const res = await request(app).post('/api/auth/login').send({
      email: 'login@test.com',
      password: 'Password1'
    })

    expect(res.status).toBe(200)
    expect(res.body.data.token).toBeTruthy()

    const decoded = jwt.verify(res.body.data.token, process.env.JWT_SECRET as string) as jwt.JwtPayload
    expect(decoded.sub).toBeTruthy()
  })

  test('Login con contraseña incorrecta → 401', async () => {
    const app = createApp()
    await request(app).post('/api/auth/register').send({
      name: 'Juan',
      email: 'wrong@test.com',
      password: 'Password1',
      role: 'patient'
    })

    const res = await request(app).post('/api/auth/login').send({
      email: 'wrong@test.com',
      password: 'Password2'
    })

    expect(res.status).toBe(401)
  })

  test('Registro con password sin mayúscula → 422 (Joi)', async () => {
    const app = createApp()
    const res = await request(app).post('/api/auth/register').send({
      name: 'Juan',
      email: 'weak@test.com',
      password: 'password1',
      role: 'patient'
    })

    expect(res.status).toBe(422)
    expect(res.body.success).toBe(false)
  })
})

