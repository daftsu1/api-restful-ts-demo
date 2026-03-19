import { AppointmentRepository } from '@modules/appointments/appointment.repository'

function chain(value: unknown) {
  return {
    lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(value) }),
    exec: jest.fn().mockResolvedValue(value),
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(value) })
    })
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

const apt = { _id: 'a1', doctorId: 'd1', patientId: 'p1', date: '2099-01-01', slot: '07:00', status: 'PENDING' as const }

describe('AppointmentRepository (unitario)', () => {
  test('findById delega en model.findById + lean + exec', async () => {
    const model = makeModel()
    model.findById.mockReturnValue(chain(apt))
    const repo = new AppointmentRepository(model)
    const result = await repo.findById('a1')
    expect(model.findById).toHaveBeenCalledWith('a1')
    expect(result).toEqual(apt)
  })

  test('findById null → null', async () => {
    const model = makeModel()
    model.findById.mockReturnValue(chain(null))
    const repo = new AppointmentRepository(model)
    expect(await repo.findById('x')).toBeNull()
  })

  test('findAll sin filtro', async () => {
    const model = makeModel()
    model.find.mockReturnValue(chain([apt]))
    const repo = new AppointmentRepository(model)
    const result = await repo.findAll()
    expect(model.find).toHaveBeenCalledWith({})
    expect(result).toEqual([apt])
  })

  test('findAll con filtro', async () => {
    const model = makeModel()
    model.find.mockReturnValue(chain([apt]))
    const repo = new AppointmentRepository(model)
    await repo.findAll({ doctorId: 'd1' } as any)
    expect(model.find).toHaveBeenCalledWith({ doctorId: 'd1' })
  })

  test('create llama model.create y retorna JSON', async () => {
    const model = makeModel()
    model.create.mockResolvedValue({ toJSON: () => apt })
    const repo = new AppointmentRepository(model)
    const result = await repo.create(apt)
    expect(result).toEqual(apt)
  })

  test('updateById delega con { new: true }', async () => {
    const updated = { ...apt, status: 'PAID' }
    const model = makeModel()
    model.findByIdAndUpdate.mockReturnValue(chain(updated))
    const repo = new AppointmentRepository(model)
    const result = await repo.updateById('a1', { status: 'PAID' } as any)
    expect(model.findByIdAndUpdate).toHaveBeenCalledWith('a1', { status: 'PAID' }, { new: true })
    expect(result).toEqual(updated)
  })

  test('deleteById true cuando deletedCount > 0', async () => {
    const model = makeModel()
    model.deleteOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ deletedCount: 1 }) })
    const repo = new AppointmentRepository(model)
    expect(await repo.deleteById('a1')).toBe(true)
  })

  test('deleteById false cuando deletedCount === 0', async () => {
    const model = makeModel()
    model.deleteOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ deletedCount: 0 }) })
    const repo = new AppointmentRepository(model)
    expect(await repo.deleteById('x')).toBe(false)
  })

  test('findByDoctorAndSlot busca con los 3 campos', async () => {
    const model = makeModel()
    model.findOne.mockReturnValue(chain(apt))
    const repo = new AppointmentRepository(model)
    const result = await repo.findByDoctorAndSlot('d1', '2099-01-01', '07:00')
    expect(model.findOne).toHaveBeenCalledWith({ doctorId: 'd1', date: '2099-01-01', slot: '07:00' })
    expect(result).toEqual(apt)
  })

  test('findByDoctorAndSlotExcludingId excluye id y REJECTED', async () => {
    const model = makeModel()
    model.findOne.mockReturnValue(chain(null))
    const repo = new AppointmentRepository(model)
    await repo.findByDoctorAndSlotExcludingId('d1', '2099-01-01', '07:00', 'a1')
    expect(model.findOne).toHaveBeenCalledWith({
      doctorId: 'd1',
      date: '2099-01-01',
      slot: '07:00',
      _id: { $ne: 'a1' },
      status: { $nin: ['REJECTED'] }
    })
  })

  test('findByDoctor sin fecha', async () => {
    const model = makeModel()
    model.find.mockReturnValue(chain([apt]))
    const repo = new AppointmentRepository(model)
    await repo.findByDoctor('d1')
    expect(model.find).toHaveBeenCalledWith({ doctorId: 'd1' })
  })

  test('findByDoctor con fecha', async () => {
    const model = makeModel()
    model.find.mockReturnValue(chain([apt]))
    const repo = new AppointmentRepository(model)
    await repo.findByDoctor('d1', '2099-01-01')
    expect(model.find).toHaveBeenCalledWith({ doctorId: 'd1', date: '2099-01-01' })
  })

  test('findByPatient filtra por patientId', async () => {
    const model = makeModel()
    model.find.mockReturnValue(chain([apt]))
    const repo = new AppointmentRepository(model)
    await repo.findByPatient('p1')
    expect(model.find).toHaveBeenCalledWith({ patientId: 'p1' })
  })

  test('findOccupiedSlots retorna array de strings', async () => {
    const model = makeModel()
    model.find.mockReturnValue(chain([{ slot: '07:00' }, { slot: '08:00' }]))
    const repo = new AppointmentRepository(model)
    const result = await repo.findOccupiedSlots('d1', '2099-01-01')
    expect(result).toEqual(['07:00', '08:00'])
    expect(model.find).toHaveBeenCalledWith({
      doctorId: 'd1',
      date: '2099-01-01',
      status: { $nin: ['REJECTED'] }
    })
  })
})
