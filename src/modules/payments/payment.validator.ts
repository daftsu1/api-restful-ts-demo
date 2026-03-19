import Joi from 'joi'

const mongoId = Joi.string().length(24).hex()

export const payWithStripeSchema = Joi.object({
  appointmentId: mongoId.required()
})
