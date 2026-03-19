import type { Response } from 'express'
import type { IAppointmentService } from '@interfaces/IAppointmentService'
import { ResponseFactory } from '@utils/ResponseFactory'
import type { AuthenticatedRequest } from '@middlewares/roleGuard.middleware'

export class AppointmentController {
  constructor(private readonly appointmentService: IAppointmentService) {}

  create = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    const user = req.user!
    const appointment = await this.appointmentService.createAppointment(user.id, req.body)
    return ResponseFactory.success(res, appointment, 'Cita creada', 201)
  }

  mine = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    const user = req.user!
    const appointments = await this.appointmentService.getMyAppointments(user.id)
    return ResponseFactory.success(res, appointments)
  }

  today = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    const user = req.user!
    const appointments = await this.appointmentService.getTodayAppointments(user.id)
    return ResponseFactory.success(res, appointments)
  }

  confirm = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    const user = req.user!
    const appointmentId = String(req.params.id)
    const appointment = await this.appointmentService.confirmAppointment(appointmentId, user.id)
    return ResponseFactory.success(res, appointment, 'Cita confirmada', 200)
  }

  reject = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    const user = req.user!
    const appointmentId = String(req.params.id)
    const appointment = await this.appointmentService.rejectAppointment(appointmentId, user.id)
    return ResponseFactory.success(res, appointment, 'Cita rechazada', 200)
  }

  reschedule = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    const user = req.user!
    const appointmentId = String(req.params.id)
    const appointment = await this.appointmentService.rescheduleAppointment(appointmentId, user.id, req.body)
    return ResponseFactory.success(res, appointment, 'Cita reagendada', 200)
  }

  complete = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    const user = req.user!
    const appointmentId = String(req.params.id)
    const appointment = await this.appointmentService.completeAppointment(appointmentId, user.id)
    return ResponseFactory.success(res, appointment, 'Visita completada', 200)
  }
}

