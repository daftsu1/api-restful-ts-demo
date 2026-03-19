import type { Response, NextFunction } from 'express'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import type { UserRole } from '@interfaces/IUser'
import { ResponseFactory } from '@utils/ResponseFactory'
import type { AuthenticatedRequest } from '@middlewares/roleGuard.middleware'

interface AccessTokenPayload extends JwtPayload {
  sub: string
  role: UserRole
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const header = req.header('Authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    ResponseFactory.error(res, 'No autenticado', 401)
    return
  }

  const secret = process.env.JWT_SECRET
  if (!secret) {
    ResponseFactory.error(res, 'JWT_SECRET no configurado', 500)
    return
  }

  try {
    const payload = jwt.verify(token, secret) as AccessTokenPayload
    req.user = { id: payload.sub, role: payload.role }
    next()
  } catch {
    ResponseFactory.error(res, 'Token inválido', 401)
  }
}

