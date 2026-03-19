import { sign, type SignOptions } from 'jsonwebtoken'
import type { IAuthService, AuthToken, LoginDto, RegisterDto } from '@interfaces/IAuthService'
import type { IUser } from '@interfaces/IUser'
import type { IUserRepository } from '@interfaces/IUserRepository'
import { AppError } from '@utils/AppError'

export class AuthService implements IAuthService {
  constructor(private readonly userRepo: IUserRepository) {}

  async register(dto: RegisterDto): Promise<IUser> {
    const existing = await this.userRepo.findByEmail(dto.email)
    if (existing) throw new AppError('Email ya registrado', 409)

    return this.userRepo.create({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      role: dto.role,
      specialty: dto.role === 'doctor' ? dto.specialty : undefined
    })
  }

  async login(dto: LoginDto): Promise<AuthToken> {
    const user = await this.userRepo.findByEmail(dto.email)
    if (!user) throw new AppError('Credenciales inválidas', 401)

    const ok = await user.comparePassword(dto.password)
    if (!ok) throw new AppError('Credenciales inválidas', 401)

    const secret = process.env.JWT_SECRET
    if (!secret) throw new AppError('JWT_SECRET no configurado', 500)

    const expiresIn = (process.env.JWT_EXPIRES_IN ?? '8h') as SignOptions['expiresIn']
    const token = sign({ role: user.role }, secret, { subject: user._id.toString(), expiresIn })

    return { token, expiresIn: String(expiresIn) }
  }
}

