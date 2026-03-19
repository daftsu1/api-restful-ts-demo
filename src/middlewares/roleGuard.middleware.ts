import type { Request, Response, NextFunction } from 'express'
import type { UserRole } from '@interfaces/IUser'
import { ResponseFactory } from '@utils/ResponseFactory'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    role: UserRole
  }
}

export const roleGuard =
  (...allowedRoles: UserRole[]) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const user = req.user
    if (!user) {
      ResponseFactory.error(res, 'No autenticado', 401)
      return
    }
    if (!allowedRoles.includes(user.role)) {
      ResponseFactory.error(res, 'Forbidden', 403)
      return
    }
    next()
  }

