import Joi from 'joi'

const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/

export const registerSchema = Joi.object({
  name: Joi.string().min(2).required(),
  email: Joi.string().email().required(),
  password: Joi.string().pattern(passwordRegex).required(),
  role: Joi.string().valid('patient', 'doctor').required(),
  specialty: Joi.string().when('role', { is: 'doctor', then: Joi.required(), otherwise: Joi.forbidden() })
})

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
})

