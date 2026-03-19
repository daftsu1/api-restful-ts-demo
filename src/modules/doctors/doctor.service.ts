import type { IDoctorService } from '@interfaces/IDoctorService'
import type { IUser } from '@interfaces/IUser'
import type { IUserRepository } from '@interfaces/IUserRepository'
import type { IAppointmentRepository } from '@interfaces/IAppointmentRepository'
import { SlotHelper } from '@utils/SlotHelper'

export class DoctorService implements IDoctorService {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly appointmentRepo: IAppointmentRepository
  ) {}

  async listDoctors(specialty?: string): Promise<IUser[]> {
    return this.userRepo.findDoctors(specialty)
  }

  async getAvailableSlots(doctorId: string, date: string): Promise<string[]> {
    const occupied = await this.appointmentRepo.findOccupiedSlots(doctorId, date)
    return SlotHelper.getAvailableSlots(occupied)
  }
}

