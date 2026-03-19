import type { IAppointment } from '@interfaces/IAppointment'

export interface CreateAppointmentDto {
  doctorId: string
  date: string
  slot: string
  reason?: string
}

export interface RescheduleAppointmentDto {
  date: string
  slot: string
}

export interface IAppointmentService {
  createAppointment(patientId: string, dto: CreateAppointmentDto): Promise<IAppointment>
  confirmAppointment(appointmentId: string, doctorId: string): Promise<IAppointment>
  rejectAppointment(appointmentId: string, doctorId: string): Promise<IAppointment>
  rescheduleAppointment(appointmentId: string, patientId: string, dto: RescheduleAppointmentDto): Promise<IAppointment>
  completeAppointment(appointmentId: string, doctorId: string): Promise<IAppointment>
  getTodayAppointments(doctorId: string): Promise<IAppointment[]>
  getMyAppointments(patientId: string): Promise<IAppointment[]>
}
