import { Router } from 'express'
import { validateSchema } from '@middlewares/validateSchema.middleware'
import { AuthController } from '@modules/auth/auth.controller'
import { AuthService } from '@modules/auth/auth.service'
import { registerSchema, loginSchema } from '@modules/auth/auth.validator'
import { UserModel } from '@models/User.model'
import type { Model } from 'mongoose'
import type { IUserRepository } from '@interfaces/IUserRepository'
import type { IUser } from '@interfaces/IUser'
import type { UserDocument } from '@models/User.model'

export const authRouter = Router()

class MongoUserRepository implements IUserRepository {
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

const userRepo = new MongoUserRepository(UserModel)
const authService = new AuthService(userRepo)
const authController = new AuthController(authService)

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Registro de usuario (patient/doctor)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *           examples:
 *             patient:
 *               summary: Registro de paciente
 *               value:
 *                 name: 'Juan Pérez'
 *                 email: 'juan@test.com'
 *                 password: 'Password1'
 *                 role: 'patient'
 *             doctor:
 *               summary: Registro de doctor
 *               value:
 *                 name: 'Dra. Ana'
 *                 email: 'ana@test.com'
 *                 password: 'Password1'
 *                 role: 'doctor'
 *                 specialty: 'cardiology'
 *     responses:
 *       201:
 *         description: Usuario creado
 *       400:
 *         description: Error de validación o negocio
 *       409:
 *         description: Email ya registrado
 *       422:
 *         description: Error de validación (Joi)
 *       500:
 *         description: Error interno del servidor
 */
authRouter.post('/register', validateSchema(registerSchema), authController.register)

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login y obtención de JWT
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: 'juan@test.com'
 *             password: 'Password1'
 *     responses:
 *       200:
 *         description: Token JWT
 *       400:
 *         description: Error de validación
 *       401:
 *         description: Credenciales inválidas
 *       422:
 *         description: Error de validación (Joi)
 *       500:
 *         description: Error interno del servidor
 */
authRouter.post('/login', validateSchema(loginSchema), authController.login)

