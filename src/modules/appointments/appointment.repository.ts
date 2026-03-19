import type { Model } from 'mongoose'
import type { IAppointmentRepository } from '@interfaces/IAppointmentRepository'
import type { IAppointment } from '@interfaces/IAppointment'
import type { AppointmentDocument } from '@models/Appointment.model'

export class AppointmentRepository implements IAppointmentRepository {
  constructor(private readonly model: Model<AppointmentDocument>) {}

  async findById(id: string): Promise<IAppointment | null> {
    return this.model.findById(id).lean<IAppointment>().exec()
  }

  async findAll(filter?: Partial<IAppointment>): Promise<IAppointment[]> {
    return this.model.find(filter ?? {}).lean<IAppointment[]>().exec()
  }

  async create(data: Partial<IAppointment>): Promise<IAppointment> {
    const created = await this.model.create(data)
    return created.toJSON() as unknown as IAppointment
  }

  async updateById(id: string, data: Partial<IAppointment>): Promise<IAppointment | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).lean<IAppointment>().exec()
  }

  async deleteById(id: string): Promise<boolean> {
    const res = await this.model.deleteOne({ _id: id }).exec()
    return (res.deletedCount ?? 0) > 0
  }

  async findByDoctorAndSlot(doctorId: string, date: string, slot: string): Promise<IAppointment | null> {
    return this.model.findOne({ doctorId, date, slot }).lean<IAppointment>().exec()
  }

  async findByDoctorAndSlotExcludingId(
    doctorId: string,
    date: string,
    slot: string,
    excludeAppointmentId: string
  ): Promise<IAppointment | null> {
    return this.model
      .findOne({
        doctorId,
        date,
        slot,
        _id: { $ne: excludeAppointmentId },
        status: { $nin: ['REJECTED'] }
      })
      .lean<IAppointment>()
      .exec()
  }

  async findByDoctor(doctorId: string, date?: string): Promise<IAppointment[]> {
    const filter: Record<string, unknown> = { doctorId }
    if (date) filter.date = date
    return this.model.find(filter).lean<IAppointment[]>().exec()
  }

  async findByPatient(patientId: string): Promise<IAppointment[]> {
    return this.model.find({ patientId }).lean<IAppointment[]>().exec()
  }

  async findOccupiedSlots(doctorId: string, date: string): Promise<string[]> {
    const appointments = await this.model
      .find({ doctorId, date, status: { $nin: ['REJECTED'] } })
      .select('slot')
      .lean<{ slot: string }[]>()
      .exec()
    return appointments.map(a => a.slot)
  }
}

