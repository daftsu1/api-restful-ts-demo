import { PaymentRepository } from '@modules/payments/payment.repository'

function chain(value: unknown) {
  return {
    lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(value) }),
    exec: jest.fn().mockResolvedValue(value)
  }
}

function makeModel() {
  return {
    findById: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    create: jest.fn(),
    deleteOne: jest.fn()
  } as any
}

const pay = { _id: 'p1', appointmentId: 'a1', stripePaymentIntentId: 'pi_x', amount: 5000, currency: 'usd', status: 'PENDING' as const }

describe('PaymentRepository (unitario)', () => {
  test('findById', async () => {
    const model = makeModel()
    model.findById.mockReturnValue(chain(pay))
    const repo = new PaymentRepository(model)
    expect(await repo.findById('p1')).toEqual(pay)
  })

  test('findAll sin filtro', async () => {
    const model = makeModel()
    model.find.mockReturnValue(chain([pay]))
    const repo = new PaymentRepository(model)
    expect(await repo.findAll()).toEqual([pay])
    expect(model.find).toHaveBeenCalledWith({})
  })

  test('create retorna JSON', async () => {
    const model = makeModel()
    model.create.mockResolvedValue({ toJSON: () => pay })
    const repo = new PaymentRepository(model)
    expect(await repo.create(pay)).toEqual(pay)
  })

  test('updateById', async () => {
    const updated = { ...pay, status: 'COMPLETED' }
    const model = makeModel()
    model.findByIdAndUpdate.mockReturnValue(chain(updated))
    const repo = new PaymentRepository(model)
    expect(await repo.updateById('p1', { status: 'COMPLETED' } as any)).toEqual(updated)
    expect(model.findByIdAndUpdate).toHaveBeenCalledWith('p1', { status: 'COMPLETED' }, { new: true })
  })

  test('deleteById true', async () => {
    const model = makeModel()
    model.deleteOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ deletedCount: 1 }) })
    const repo = new PaymentRepository(model)
    expect(await repo.deleteById('p1')).toBe(true)
  })

  test('deleteById false', async () => {
    const model = makeModel()
    model.deleteOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ deletedCount: 0 }) })
    const repo = new PaymentRepository(model)
    expect(await repo.deleteById('x')).toBe(false)
  })

  test('findByAppointmentId', async () => {
    const model = makeModel()
    model.findOne.mockReturnValue(chain(pay))
    const repo = new PaymentRepository(model)
    expect(await repo.findByAppointmentId('a1')).toEqual(pay)
    expect(model.findOne).toHaveBeenCalledWith({ appointmentId: 'a1' })
  })

  test('findByStripePaymentIntentId', async () => {
    const model = makeModel()
    model.findOne.mockReturnValue(chain(pay))
    const repo = new PaymentRepository(model)
    expect(await repo.findByStripePaymentIntentId('pi_x')).toEqual(pay)
    expect(model.findOne).toHaveBeenCalledWith({ stripePaymentIntentId: 'pi_x' })
  })
})
