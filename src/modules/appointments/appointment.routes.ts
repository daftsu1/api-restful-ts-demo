import { Router } from 'express'
import { validateSchema } from '@middlewares/validateSchema.middleware'
import { authMiddleware } from '@middlewares/auth.middleware'
import { roleGuard } from '@middlewares/roleGuard.middleware'
import { AppointmentController } from '@modules/appointments/appointment.controller'
import { AppointmentService } from '@modules/appointments/appointment.service'
import { AppointmentRepository } from '@modules/appointments/appointment.repository'
import {
  appointmentParamSchema,
  createAppointmentSchema,
  rescheduleAppointmentSchema
} from '@modules/appointments/appointment.validator'
import { AppointmentModel } from '@models/Appointment.model'

export const appointmentRouter = Router()

const appointmentRepo = new AppointmentRepository(AppointmentModel)
const appointmentService = new AppointmentService(appointmentRepo)
const appointmentController = new AppointmentController(appointmentService)

appointmentRouter.use(authMiddleware)

/**
 * @openapi
 * /api/appointments:
 *   post:
 *     summary: Crear una cita
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAppointmentRequest'
 *     description: |
 *       La cita queda **PENDING**. Para pagarla (Stripe test): **`POST /api/payments/pay`** con `{ "appointmentId": "<id>" }`.
 *     responses:
 *       201:
 *         description: Cita creada (PENDING hasta pagar)
 *       400:
 *         description: Error de validación o de negocio (slot/fecha inválida)
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos (solo pacientes)
 *       409:
 *         description: Slot ya ocupado
 *       422:
 *         description: Error de validación (Joi)
 *       500:
 *         description: Error interno del servidor
 */
appointmentRouter.post('/', roleGuard('patient'), validateSchema(createAppointmentSchema), appointmentController.create)

/**
 * @openapi
 * /api/appointments/mine:
 *   get:
 *     summary: Obtener mis citas (paciente autenticado)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de citas del paciente
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos (solo pacientes)
 *       500:
 *         description: Error interno del servidor
 */
appointmentRouter.get('/mine', roleGuard('patient'), appointmentController.mine)

/**
 * @openapi
 * /api/appointments/today:
 *   get:
 *     summary: Obtener citas de hoy (doctor autenticado)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de citas del día
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos (solo doctores)
 *       500:
 *         description: Error interno del servidor
 */
appointmentRouter.get('/today', roleGuard('doctor'), appointmentController.today)

/**
 * @openapi
 * /api/appointments/{id}/confirm:
 *   patch:
 *     summary: Confirmar cita (solo si está pagada vía Stripe — POST /api/payments/pay)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la cita
 *     responses:
 *       200:
 *         description: Cita confirmada
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos o cita no pagada
 *       404:
 *         description: Cita no encontrada
 *       500:
 *         description: Error interno del servidor
 */
appointmentRouter.patch(
  '/:id/confirm',
  roleGuard('doctor'),
  validateSchema(appointmentParamSchema, 'params'),
  appointmentController.confirm
)

/**
 * @openapi
 * /api/appointments/{id}/reject:
 *   patch:
 *     summary: Rechazar cita
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la cita
 *     responses:
 *       200:
 *         description: Cita rechazada
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos
 *       404:
 *         description: Cita no encontrada
 *       500:
 *         description: Error interno del servidor
 */
appointmentRouter.patch(
  '/:id/reject',
  roleGuard('doctor'),
  validateSchema(appointmentParamSchema, 'params'),
  appointmentController.reject
)

/**
 * @openapi
 * /api/appointments/{id}/reschedule:
 *   patch:
 *     summary: Reagendar cita (paciente dueño; estados PENDING, PAID o CONFIRMED)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, slot]
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               slot:
 *                 type: string
 *                 example: "08:00"
 *     responses:
 *       200:
 *         description: Cita reagendada
 *       400:
 *         description: Estado no permitido o fecha/slot inválidos
 *       409:
 *         description: Slot ocupado
 */
appointmentRouter.patch(
  '/:id/reschedule',
  roleGuard('patient'),
  validateSchema(appointmentParamSchema, 'params'),
  validateSchema(rescheduleAppointmentSchema),
  appointmentController.reschedule
)

/**
 * @openapi
 * /api/appointments/{id}/complete:
 *   patch:
 *     summary: Marcar visita como completada (doctor; solo si CONFIRMED)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cita completada
 *       400:
 *         description: La cita no está confirmada
 */
appointmentRouter.patch(
  '/:id/complete',
  roleGuard('doctor'),
  validateSchema(appointmentParamSchema, 'params'),
  appointmentController.complete
)

