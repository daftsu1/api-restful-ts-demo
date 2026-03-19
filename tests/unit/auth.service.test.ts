import { AuthService } from '@modules/auth/auth.service'
import type { IUserRepository } from '@interfaces/IUserRepository'
import type { IUser } from '@interfaces/IUser'
import { AppError } from '@utils/AppError'
import jwt from 'jsonwebtoken'

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

const fakeUser: IUser = {
  _id: 'u1',
  name: 'Test',
  email: 'test@test.com',
  password: 'hashed',
  role: 'patient',
  createdAt: new Date(),
  comparePassword: jest.fn()
}

describe('AuthService (unitario)', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test_secret_unit'
    process.env.JWT_EXPIRES_IN = '1h'
  })

  describe('register', () => {
    test('email duplicado → 409', async () => {
      const repo = makeUserRepo({ findByEmail: jest.fn().mockResolvedValue(fakeUser) })
      const svc = new AuthService(repo)
      await expect(svc.register({ name: 'A', email: 'test@test.com', password: 'Pass1234', role: 'patient' }))
        .rejects.toThrow(new AppError('Email ya registrado', 409))
      expect(repo.create).not.toHaveBeenCalled()
    })

    test('registro OK → llama create con datos correctos', async () => {
      const created = { ...fakeUser, _id: 'u2', name: 'Nuevo' }
      const repo = makeUserRepo({
        findByEmail: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(created)
      })
      const svc = new AuthService(repo)
      const result = await svc.register({ name: 'Nuevo', email: 'nuevo@test.com', password: 'Pass1234', role: 'patient' })
      expect(result).toEqual(created)
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Nuevo',
        email: 'nuevo@test.com',
        role: 'patient',
        specialty: undefined
      }))
    })

    test('doctor → incluye specialty', async () => {
      const repo = makeUserRepo({
        findByEmail: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ ...fakeUser, role: 'doctor', specialty: 'cardiology' })
      })
      const svc = new AuthService(repo)
      await svc.register({ name: 'Doc', email: 'd@t.com', password: 'Pass1234', role: 'doctor', specialty: 'cardiology' })
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ specialty: 'cardiology' }))
    })
  })

  describe('login', () => {
    test('email no existe → 401', async () => {
      const repo = makeUserRepo({ findByEmail: jest.fn().mockResolvedValue(null) })
      const svc = new AuthService(repo)
      await expect(svc.login({ email: 'x@x.com', password: 'abc' }))
        .rejects.toThrow(new AppError('Credenciales inválidas', 401))
    })

    test('password incorrecta → 401', async () => {
      const user = { ...fakeUser, comparePassword: jest.fn().mockResolvedValue(false) }
      const repo = makeUserRepo({ findByEmail: jest.fn().mockResolvedValue(user) })
      const svc = new AuthService(repo)
      await expect(svc.login({ email: 'test@test.com', password: 'wrong' }))
        .rejects.toThrow(new AppError('Credenciales inválidas', 401))
    })

    test('login OK → devuelve JWT válido', async () => {
      const user = { ...fakeUser, comparePassword: jest.fn().mockResolvedValue(true) }
      const repo = makeUserRepo({ findByEmail: jest.fn().mockResolvedValue(user) })
      const svc = new AuthService(repo)
      const result = await svc.login({ email: 'test@test.com', password: 'ok' })
      expect(result.token).toBeTruthy()
      expect(result.expiresIn).toBe('1h')
      const decoded = jwt.verify(result.token, 'test_secret_unit') as jwt.JwtPayload
      expect(decoded.sub).toBe('u1')
      expect(decoded.role).toBe('patient')
    })
  })
})
