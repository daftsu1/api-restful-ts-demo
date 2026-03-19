import express, { type Application, type Request, type Response } from 'express'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'
import swaggerJSDoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import path from 'path'

import { connectDatabase } from '@config/database'
import { errorHandler } from '@middlewares/error.middleware'

import { authRouter } from '@modules/auth/auth.routes'
import { appointmentRouter } from '@modules/appointments/appointment.routes'
import { paymentRouter } from '@modules/payments/payment.routes'
import { doctorRouter } from '@modules/doctors/doctor.routes'

dotenv.config()

function localDateYMD(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function createApp(): Application {
  const app = express()
  const swaggerDateExample = localDateYMD()

  app.use(express.json())

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 100,
      standardHeaders: 'draft-7',
      legacyHeaders: false
    })
  )

  const swaggerSpec = swaggerJSDoc({
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Medical Appointments API',
        version: '1.0.0'
      },
      // Swagger UI envía el JWT solo en ops con security; login/register usan security: []
      security: [{ bearerAuth: [] }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        },
        schemas: {
          ApiResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string', nullable: true },
              errors: {
                type: 'array',
                items: { type: 'string' },
                nullable: true
              },
              data: {}
            }
          },
          RegisterRequest: {
            type: 'object',
            required: ['name', 'email', 'password', 'role'],
            properties: {
              name: { type: 'string', example: 'Juan Pérez' },
              email: { type: 'string', format: 'email', example: 'juan@test.com' },
              password: {
                type: 'string',
                example: 'Password1',
                description: 'Mínimo 8 caracteres, al menos una mayúscula y un número'
              },
              role: { type: 'string', enum: ['patient', 'doctor'], example: 'patient' },
              specialty: {
                type: 'string',
                nullable: true,
                example: 'cardiology',
                description: 'Requerido solo si role = doctor'
              }
            }
          },
          LoginRequest: {
            type: 'object',
            required: ['email', 'password'],
            properties: {
              email: { type: 'string', format: 'email', example: 'juan@test.com' },
              password: { type: 'string', example: 'Password1' }
            }
          },
          AuthToken: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              expiresIn: { type: 'string', example: '8h' }
            }
          },
          CreateAppointmentRequest: {
            type: 'object',
            required: ['doctorId', 'date', 'slot'],
            properties: {
              doctorId: {
                type: 'string',
                example: '64f0c1b2e4f1a23b45678901',
                description: 'ID del médico (Mongo ObjectId)'
              },
              date: {
                type: 'string',
                format: 'date',
                example: swaggerDateExample,
                description: 'Fecha de la cita (YYYY-MM-DD). Ejemplo = hoy al generar Swagger.'
              },
              slot: {
                type: 'string',
                example: '07:00',
                description: 'Slot horario válido'
              },
              reason: {
                type: 'string',
                maxLength: 300,
                example: 'Dolor de cabeza'
              }
            }
          },
          PayWithStripeRequest: {
            type: 'object',
            required: ['appointmentId'],
            properties: {
              appointmentId: {
                type: 'string',
                example: '64f0c1b2e4f1a23b45678902',
                description: 'ID de la cita en PENDING'
              }
            }
          }
        }
      }
    },
    // Funciona tanto en dev (TS) como en prod (JS compilado)
    apis: [path.join(__dirname, 'modules/**/*.routes.{ts,js}')]
  })

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

  app.get('/health', (_req: Request, res: Response) => res.status(200).json({ ok: true }))

  app.use('/api/auth', authRouter)
  app.use('/api/doctors', doctorRouter)
  app.use('/api/appointments', appointmentRouter)
  app.use('/api/payments', paymentRouter)

  app.use(errorHandler)

  return app
}

async function start(): Promise<void> {
  const port = Number(process.env.PORT ?? 3000)
  await connectDatabase()

  const app = createApp()
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on port ${port}`)
  })
}

// In CommonJS, this is the safest entrypoint guard.
// eslint-disable-next-line @typescript-eslint/no-var-requires
if (require.main === module) {
  start().catch(err => {
    // eslint-disable-next-line no-console
    console.error(err)
    process.exit(1)
  })
}

