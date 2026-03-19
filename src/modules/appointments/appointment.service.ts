import type {
  IAppointmentService,
  CreateAppointmentDto,
  RescheduleAppointmentDto
} from '@interfaces/IAppointmentService'
import type { AppointmentStatus, IAppointment } from '@interfaces/IAppointment'
import type { IAppointmentRepository } from '@interfaces/IAppointmentRepository'
import { AppError } from '@utils/AppError'
import { SlotHelper } from '@utils/SlotHelper'

export class AppointmentService implements IAppointmentService {
  constructor(private readonly appointmentRepo: IAppointmentRepository) {}

  async createAppointment(patientId: string, dto: CreateAppointmentDto): Promise<IAppointment> {
    if (!SlotHelper.isValidSlot(dto.slot)) throw new AppError('Slot inválido o fuera de horario', 400)
    if (SlotHelper.isDateInPast(dto.date)) throw new AppError('No se puede agendar en una fecha pasada', 400)

    const occupied = await this.appointmentRepo.findByDoctorAndSlot(dto.doctorId, dto.date, dto.slot)
    if (occupied) throw new AppError('El horario ya está reservado', 409)

    return this.appointmentRepo.create({
      patientId,
      doctorId: dto.doctorId,
      date: dto.date,
      slot: dto.slot,
      reason: dto.reason,
      status: 'PENDING'
    })
  }

  async confirmAppointment(appointmentId: string, doctorId: string): Promise<IAppointment> {
    const appointment = await this.appointmentRepo.findById(appointmentId)
    if (!appointment) throw new AppError('Cita no encontrada', 404)
    if (appointment.doctorId.toString() !== doctorId) throw new AppError('No tienes permiso sobre esta cita', 403)
    if (appointment.status !== 'PAID') throw new AppError('La cita no ha sido pagada', 403)

    const updated = await this.appointmentRepo.updateById(appointmentId, { status: 'CONFIRMED' })
    if (!updated) throw new AppError('No se pudo actualizar la cita', 500)
    return updated
  }

  async rejectAppointment(appointmentId: string, doctorId: string): Promise<IAppointment> {
    const appointment = await this.appointmentRepo.findById(appointmentId)
    if (!appointment) throw new AppError('Cita no encontrada', 404)
    if (appointment.doctorId.toString() !== doctorId) throw new AppError('No tienes permiso sobre esta cita', 403)

    const updated = await this.appointmentRepo.updateById(appointmentId, { status: 'REJECTED' })
    if (!updated) throw new AppError('No se pudo actualizar la cita', 500)
    return updated
  }

  async rescheduleAppointment(
    appointmentId: string,
    patientId: string,
    dto: RescheduleAppointmentDto
  ): Promise<IAppointment> {
    if (!SlotHelper.isValidSlot(dto.slot)) throw new AppError('Slot inválido o fuera de horario', 400)
    if (SlotHelper.isDateInPast(dto.date)) throw new AppError('No se puede agendar en una fecha pasada', 400)

    const appointment = await this.appointmentRepo.findById(appointmentId)
    if (!appointment) throw new AppError('Cita no encontrada', 404)
    if (appointment.patientId.toString() !== patientId) throw new AppError('No tienes permiso sobre esta cita', 403)

    const allowed: AppointmentStatus[] = ['PENDING', 'PAID', 'CONFIRMED']
    if (!allowed.includes(appointment.status)) {
      throw new AppError('No se puede reagendar esta cita en su estado actual', 400)
    }

    const doctorId = appointment.doctorId.toString()
    const conflict = await this.appointmentRepo.findByDoctorAndSlotExcludingId(
      doctorId,
      dto.date,
      dto.slot,
      appointmentId
    )
    if (conflict) throw new AppError('El horario ya está reservado', 409)

    const updated = await this.appointmentRepo.updateById(appointmentId, {
      date: dto.date,
      slot: dto.slot
    })
    if (!updated) throw new AppError('No se pudo actualizar la cita', 500)
    return updated
  }

  async completeAppointment(appointmentId: string, doctorId: string): Promise<IAppointment> {
    const appointment = await this.appointmentRepo.findById(appointmentId)
    if (!appointment) throw new AppError('Cita no encontrada', 404)
    if (appointment.doctorId.toString() !== doctorId) throw new AppError('No tienes permiso sobre esta cita', 403)
    if (appointment.status !== 'CONFIRMED') {
      throw new AppError('Solo se puede completar una cita confirmada', 400)
    }

    const updated = await this.appointmentRepo.updateById(appointmentId, { status: 'COMPLETED' })
    if (!updated) throw new AppError('No se pudo actualizar la cita', 500)
    return updated
  }

  async getTodayAppointments(doctorId: string): Promise<IAppointment[]> {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const today = `${yyyy}-${mm}-${dd}`
    return this.appointmentRepo.findByDoctor(doctorId, today)
  }

  async getMyAppointments(patientId: string): Promise<IAppointment[]> {
    return this.appointmentRepo.findByPatient(patientId)
  }
}
