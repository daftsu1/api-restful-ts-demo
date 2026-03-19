import { AppError } from '@utils/AppError'

describe('AppError (unitario)', () => {
  test('hereda de Error con message correcto', () => {
    const err = new AppError('Not found', 404)
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(AppError)
    expect(err.message).toBe('Not found')
  })

  test('almacena statusCode', () => {
    const err = new AppError('Forbidden', 403)
    expect(err.statusCode).toBe(403)
  })

  test('isOperational siempre true', () => {
    const err = new AppError('test', 500)
    expect(err.isOperational).toBe(true)
  })

  test('tiene stack trace', () => {
    const err = new AppError('x', 400)
    expect(err.stack).toBeDefined()
    expect(err.stack).toContain('AppError')
  })
})
