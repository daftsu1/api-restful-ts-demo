import type { Model } from 'mongoose'
import type { IUserRepository } from '@interfaces/IUserRepository'
import type { IUser } from '@interfaces/IUser'
import type { UserDocument } from '@models/User.model'

export class UserRepository implements IUserRepository {
  constructor(private readonly model: Model<UserDocument>) {}

  async findById(id: string): Promise<IUser | null> {
    return this.model.findById(id).lean<IUser>().exec()
  }

  async findAll(filter?: Partial<IUser>): Promise<IUser[]> {
    return this.model.find(filter ?? {}).lean<IUser[]>().exec()
  }

  async create(data: Partial<IUser>): Promise<IUser> {
    const created = await this.model.create(data)
    return created.toJSON() as unknown as IUser
  }

  async updateById(id: string, data: Partial<IUser>): Promise<IUser | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).lean<IUser>().exec()
  }

  async deleteById(id: string): Promise<boolean> {
    const res = await this.model.deleteOne({ _id: id }).exec()
    return (res.deletedCount ?? 0) > 0
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return (await this.model.findOne({ email }).exec()) as unknown as IUser | null
  }

  async findDoctors(specialty?: string): Promise<IUser[]> {
    const filter: Record<string, unknown> = { role: 'doctor' }
    if (specialty) filter.specialty = specialty
    return this.model.find(filter).lean<IUser[]>().exec()
  }
}

