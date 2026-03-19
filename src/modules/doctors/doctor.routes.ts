import { Router } from 'express'
import Joi from 'joi'
import { validateSchema } from '@middlewares/validateSchema.middleware'
import { authMiddleware } from '@middlewares/auth.middleware'
import { roleGuard } from '@middlewares/roleGuard.middleware'
import { DoctorController } from '@modules/doctors/doctor.controller'
import { DoctorService } from '@modules/doctors/doctor.service'
import { UserRepository } from '@modules/doctors/doctor.repository'
import { UserModel } from '@models/User.model'
import { AppointmentModel } from '@models/Appointment.model'
import { AppointmentRepository } from '@modules/appointments/appointment.repository'

export const doctorRouter = Router()

const getSlotsQuerySchema = Joi.object({
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required()
})

const userRepo = new UserRepository(UserModel)
const appointmentRepo = new AppointmentRepository(AppointmentModel)
const doctorService = new DoctorService(userRepo, appointmentRepo)
const doctorController = new DoctorController(doctorService)

doctorRouter.use(authMiddleware)
doctorRouter.use(roleGuard('patient'))

/**
 * @openapi
 * /api/doctors:
 *   get:
 *     summary: Listar médicos
 *     tags: [Doctors]
 *     parameters:
 *       - in: query
 *         name: specialty
 *         schema:
 *           type: string
 *         required: false
 *         description: Filtrar por especialidad
 *     responses:
 *       200:
 *         description: Lista de médicos
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos (solo pacientes)
 *       500:
 *         description: Error interno del servidor
 */
doctorRouter.get('/', doctorController.list)

/**
 * @openapi
 * /api/doctors/{id}/slots:
 *   get:
 *     summary: Obtener slots disponibles para un médico en una fecha
 *     tags: [Doctors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del médico
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha en formato YYYY-MM-DD
 *     responses:
 *       200:
 *         description: Lista de slots disponibles
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos (solo pacientes)
 *       500:
 *         description: Error interno del servidor
 */
doctorRouter.get('/:id/slots', validateSchema(getSlotsQuerySchema, 'query'), doctorController.slots)

