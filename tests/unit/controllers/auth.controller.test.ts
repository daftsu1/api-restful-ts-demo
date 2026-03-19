import { AuthController } from '@modules/auth/auth.controller'
import type { IAuthService } from '@interfaces/IAuthService'

function mockRes() {
  const res: any = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

const user = { _id: 'u1', name: 'Test', email: 'test@t.com', role: 'patient' }
const token = { token: 'jwt_abc', expiresIn: '8h' }

describe('AuthController (unitario)', () => {
  test('register → llama service.register y responde 201', async () => {
    const svc: IAuthService = {
      register: jest.fn().mockResolvedValue(user),
      login: jest.fn()
    }
    const ctrl = new AuthController(svc)
    const req = { body: { name: 'Test', email: 'test@t.com', password: 'Pass1234', role: 'patient' } } as any
    const res = mockRes()
    await ctrl.register(req, res)
    expect(svc.register).toHaveBeenCalledWith(req.body)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: user }))
  })

  test('login → llama service.login y responde 200', async () => {
    const svc: IAuthService = {
      register: jest.fn(),
      login: jest.fn().mockResolvedValue(token)
    }
    const ctrl = new AuthController(svc)
    const req = { body: { email: 'test@t.com', password: 'Pass1234' } } as any
    const res = mockRes()
    await ctrl.login(req, res)
    expect(svc.login).toHaveBeenCalledWith(req.body)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: token }))
  })
})
