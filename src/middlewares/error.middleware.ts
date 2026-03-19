import type { Request, Response, NextFunction } from 'express'
import { AppError } from '@utils/AppError'
import { ResponseFactory } from '@utils/ResponseFactory'

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction): Response => {
  if (err instanceof AppError) {
    return ResponseFactory.error(res, err.message, err.statusCode)
  }

  const message = err instanceof Error ? err.message : 'Internal server error'
  return ResponseFactory.error(res, message, 500)
}

