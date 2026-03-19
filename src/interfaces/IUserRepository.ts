import type { IRepository } from '@interfaces/IRepository'
import type { IUser } from '@interfaces/IUser'

export interface IUserRepository extends IRepository<IUser> {
  findByEmail(email: string): Promise<IUser | null>
  findDoctors(specialty?: string): Promise<IUser[]>
}

