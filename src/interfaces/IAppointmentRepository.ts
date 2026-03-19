import type { IRepository } from '@interfaces/IRepository'
import type { IAppointment } from '@interfaces/IAppointment'

export interface IAppointmentRepository extends IRepository<IAppointment> {
  findByDoctorAndSlot(doctorId: string, date: string, slot: string): Promise<IAppointment | null>
  findByDoctorAndSlotExcludingId(
    doctorId: string,
    date: string,
    slot: string,
    excludeAppointmentId: string
  ): Promise<IAppointment | null>
  findByDoctor(doctorId: string, date?: string): Promise<IAppointment[]>
  findByPatient(patientId: string): Promise<IAppointment[]>
  findOccupiedSlots(doctorId: string, date: string): Promise<string[]>
}

