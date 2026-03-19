import type { Request, Response } from 'express'
import type { IAuthService } from '@interfaces/IAuthService'
import { ResponseFactory } from '@utils/ResponseFactory'

export class AuthController {
  constructor(private readonly authService: IAuthService) {}

  register = async (req: Request, res: Response): Promise<Response> => {
    const user = await this.authService.register(req.body)
    return ResponseFactory.success(res, user, 'Usuario creado', 201)
  }

  login = async (req: Request, res: Response): Promise<Response> => {
    const data = await this.authService.login(req.body)
    return ResponseFactory.success(res, data, 'OK', 200)
  }
}

