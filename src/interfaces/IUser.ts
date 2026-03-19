export type UserRole = 'patient' | 'doctor'

export interface IUser {
  _id: string
  name: string
  email: string
  password: string
  role: UserRole
  specialty?: string
  createdAt: Date
  comparePassword(plain: string): Promise<boolean>
}

