import type { Request, Response, NextFunction } from 'express'
import Joi from 'joi'

type ValidationTarget = 'body' | 'query' | 'params'

export const validateSchema =
  (schema: Joi.ObjectSchema, target: ValidationTarget = 'body') =>
  (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req[target], { abortEarly: false })
    if (error) {
      const errors = error.details.map(d => d.message)
      res.status(422).json({ success: false, message: 'Validation error', errors })
      return
    }
    next()
  }

