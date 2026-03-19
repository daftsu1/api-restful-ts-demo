import Joi from 'joi'

const mongoId = Joi.string().length(24).hex()

export const createAppointmentSchema = Joi.object({
  doctorId: mongoId.required(),
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  slot: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
  reason: Joi.string().max(300).optional()
})

export const appointmentParamSchema = Joi.object({
  id: mongoId.required()
})

export const rescheduleAppointmentSchema = Joi.object({
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  slot: Joi.string().pattern(/^\d{2}:\d{2}$/).required()
})

