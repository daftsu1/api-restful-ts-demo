import type { IUser } from '@interfaces/IUser'

export interface RegisterDto {
  name: string
  email: string
  password: string
  role: 'patient' | 'doctor'
  specialty?: string
}

export interface LoginDto {
  email: string
  password: string
}

export interface AuthToken {
  token: string
  expiresIn: string
}

export interface IAuthService {
  register(dto: RegisterDto): Promise<IUser>
  login(dto: LoginDto): Promise<AuthToken>
}

