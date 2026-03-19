import type { IUser } from '@interfaces/IUser'

export interface IDoctorService {
  listDoctors(specialty?: string): Promise<IUser[]>
  getAvailableSlots(doctorId: string, date: string): Promise<string[]>
}

