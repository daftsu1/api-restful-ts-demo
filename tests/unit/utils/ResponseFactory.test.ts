import { ResponseFactory } from '@utils/ResponseFactory'

function mockRes() {
  const res: any = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe('ResponseFactory (unitario)', () => {
  describe('success', () => {
    test('status por defecto 200', () => {
      const res = mockRes()
      ResponseFactory.success(res, { id: 1 })
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 1 }, message: 'OK' })
    })

    test('status y message personalizados', () => {
      const res = mockRes()
      ResponseFactory.success(res, null, 'Creado', 201)
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith({ success: true, data: null, message: 'Creado' })
    })
  })

  describe('error', () => {
    test('status por defecto 400', () => {
      const res = mockRes()
      ResponseFactory.error(res, 'Bad request')
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Bad request', errors: [] })
    })

    test('status 500 con array de errores', () => {
      const res = mockRes()
      ResponseFactory.error(res, 'Error interno', 500, ['detalle1', 'detalle2'])
      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error interno',
        errors: ['detalle1', 'detalle2']
      })
    })
  })
})
