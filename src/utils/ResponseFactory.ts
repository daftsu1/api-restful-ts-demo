import type { Response } from 'express'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  errors?: string[]
}

export class ResponseFactory {
  static success<T>(res: Response, data: T, message = 'OK', statusCode = 200): Response {
    return res.status(statusCode).json({ success: true, data, message } as ApiResponse<T>)
  }

  static error(res: Response, message: string, statusCode = 400, errors: string[] = []): Response {
    return res.status(statusCode).json({ success: false, message, errors } as ApiResponse<null>)
  }
}

