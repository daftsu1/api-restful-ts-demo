import { roleGuard } from '@middlewares/roleGuard.middleware'

function mockRes() {
  const res: any = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe('roleGuard (unitario)', () => {
  test('sin user → 401 No autenticado', () => {
    const mw = roleGuard('patient')
    const req = {} as any
    const res = mockRes()
    const next = jest.fn()
    mw(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'No autenticado' }))
  })

  test('rol incorrecto → 403 Forbidden', () => {
    const mw = roleGuard('doctor')
    const req = { user: { id: 'u1', role: 'patient' } } as any
    const res = mockRes()
    const next = jest.fn()
    mw(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })

  test('rol correcto → llama next()', () => {
    const mw = roleGuard('patient')
    const req = { user: { id: 'u1', role: 'patient' } } as any
    const res = mockRes()
    const next = jest.fn()
    mw(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  test('múltiples roles permitidos → acepta cualquiera', () => {
    const mw = roleGuard('patient', 'doctor')
    const req = { user: { id: 'u1', role: 'doctor' } } as any
    const res = mockRes()
    const next = jest.fn()
    mw(req, res, next)
    expect(next).toHaveBeenCalled()
  })
})
