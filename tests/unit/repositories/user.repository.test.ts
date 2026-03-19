import { UserRepository } from '@modules/doctors/doctor.repository'

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

const user = { _id: 'u1', name: 'Test', email: 'test@t.com', role: 'patient' as const, password: 'hashed' }

describe('UserRepository (unitario)', () => {
  test('findById', async () => {
    const model = makeModel()
    model.findById.mockReturnValue(chain(user))
    const repo = new UserRepository(model)
    expect(await repo.findById('u1')).toEqual(user)
  })

  test('findAll', async () => {
    const model = makeModel()
    model.find.mockReturnValue(chain([user]))
    const repo = new UserRepository(model)
    expect(await repo.findAll()).toEqual([user])
  })

  test('create', async () => {
    const model = makeModel()
    model.create.mockResolvedValue({ toJSON: () => user })
    const repo = new UserRepository(model)
    expect(await repo.create(user)).toEqual(user)
  })

  test('updateById', async () => {
    const model = makeModel()
    model.findByIdAndUpdate.mockReturnValue(chain({ ...user, name: 'Updated' }))
    const repo = new UserRepository(model)
    const result = await repo.updateById('u1', { name: 'Updated' } as any)
    expect(result!.name).toBe('Updated')
  })

  test('deleteById', async () => {
    const model = makeModel()
    model.deleteOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ deletedCount: 1 }) })
    const repo = new UserRepository(model)
    expect(await repo.deleteById('u1')).toBe(true)
  })

  test('findByEmail usa findOne con exec (no lean)', async () => {
    const model = makeModel()
    model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(user) })
    const repo = new UserRepository(model)
    expect(await repo.findByEmail('test@t.com')).toEqual(user)
    expect(model.findOne).toHaveBeenCalledWith({ email: 'test@t.com' })
  })

  test('findByEmail null', async () => {
    const model = makeModel()
    model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) })
    const repo = new UserRepository(model)
    expect(await repo.findByEmail('x@x.com')).toBeNull()
  })

  test('findDoctors sin specialty', async () => {
    const doc = { ...user, role: 'doctor' }
    const model = makeModel()
    model.find.mockReturnValue(chain([doc]))
    const repo = new UserRepository(model)
    expect(await repo.findDoctors()).toEqual([doc])
    expect(model.find).toHaveBeenCalledWith({ role: 'doctor' })
  })

  test('findDoctors con specialty', async () => {
    const model = makeModel()
    model.find.mockReturnValue(chain([]))
    const repo = new UserRepository(model)
    await repo.findDoctors('cardiology')
    expect(model.find).toHaveBeenCalledWith({ role: 'doctor', specialty: 'cardiology' })
  })
})
