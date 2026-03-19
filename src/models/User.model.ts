import { Schema, model, type Document, type Types } from 'mongoose'
import bcrypt from 'bcryptjs'
import type { IUser } from '@interfaces/IUser'

type UserSchemaShape = Omit<IUser, '_id' | 'createdAt'>

export interface UserDocument extends UserSchemaShape, Document {
  _id: Types.ObjectId
  createdAt: Date
  comparePassword(plain: string): Promise<boolean>
}

const UserSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, minlength: 2 },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['patient', 'doctor'], required: true },
    specialty: { type: String }
  },
  { timestamps: true }
)

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

UserSchema.methods.comparePassword = async function (plain: string): Promise<boolean> {
  return bcrypt.compare(plain, this.password)
}

UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const mutable = ret as unknown as { password?: unknown }
    delete mutable.password
    return ret
  }
})

export const UserModel = model<UserDocument>('User', UserSchema)

