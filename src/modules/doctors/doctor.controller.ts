import type { Response } from 'express'
import type { IDoctorService } from '@interfaces/IDoctorService'
import { ResponseFactory } from '@utils/ResponseFactory'
import type { AuthenticatedRequest } from '@middlewares/roleGuard.middleware'

export class DoctorController {
  constructor(private readonly doctorService: IDoctorService) {}

  list = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    const specialty = typeof req.query.specialty === 'string' ? req.query.specialty : undefined
    const doctors = await this.doctorService.listDoctors(specialty)
    return ResponseFactory.success(res, doctors)
  }

  slots = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    const date = String(req.query.date)
    const doctorId = String(req.params.id)
    const slots = await this.doctorService.getAvailableSlots(doctorId, date)
    return ResponseFactory.success(res, slots)
  }
}

