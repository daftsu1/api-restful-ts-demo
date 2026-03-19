# Medical Appointments REST API (TypeScript)

API REST para **citas médicas** (paciente / médico), **JWT**, **MongoDB** y **pagos con Stripe**.

---

## Arquitectura (capas)

```
Routes → Middleware → Controllers → Services → Repositories → Models
                ↕            ↕           ↕            ↕
           Interfaces   Interfaces  Interfaces   Interfaces
```

| Capa | Rol |
|------|-----|
| **Routes** | Endpoints; instancia controllers (inyección por constructor). |
| **Middlewares** | Auth JWT, roles, validación Joi, rate limit, errores. |
| **Controllers** | Solo HTTP (req/res); delegan en services. |
| **Services** | Reglas de negocio; lanzan `AppError` con código HTTP. |
| **Repositories** | Acceso a datos (Mongoose); implementan interfaces. |
| **Models** | Esquemas Mongoose tipados. |

---

## Requisitos previos

- Node.js 18+
- MongoDB (local) o Docker

## Levantar con Docker

```bash
copy .env.example .env
docker-compose up --build
```

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api/docs` — tras **Login**, **Authorize** con el JWT; en **Value** pegá solo el token (sin escribir `Bearer`).

## Levantar en local (sin Docker)

```bash
npm install
copy .env.example .env
npm run dev
```

---

## Variables de entorno

| Variable | Uso |
|----------|-----|
| `PORT` | Puerto (default 3000) |
| `MONGO_URI` | Conexión MongoDB |
| `JWT_SECRET` | Firma del token |
| `JWT_EXPIRES_IN` | Ej. `8h` |
| `STRIPE_SECRET_KEY` | **`sk_test_...`** obligatorio para pagar citas |

Copiá `.env.example` a `.env` y completá valores.

---

## Flujo típico (paciente → médico)

1. **Registrar / login** (paciente y médico).
2. **Crear cita** — `POST /api/appointments` → estado **PENDING**.
3. **Pagar con Stripe** — `POST /api/payments/pay` con `{ "appointmentId": "<id>" }` → **PAID** (modo test: confirma con tarjeta de prueba en el servidor).
4. **Confirmar cita** (médico) — `PATCH /api/appointments/{id}/confirm` → **CONFIRMED**.
5. **Cerrar visita** (médico) — `PATCH /api/appointments/{id}/complete` → **COMPLETED**.

Único endpoint de pago: **`POST /api/payments/pay`**. No hay pago “simulado” aparte.

---

## Endpoints (resumen)

### Auth — `/api/auth`

- **POST** `/register`, **POST** `/login`

### Doctors — `/api/doctors` (JWT paciente)

- **GET** `/`, **GET** `/:id/slots?date=`

### Appointments — `/api/appointments` (JWT)

- **POST** `/` — crear cita
- **GET** `/mine`, **GET** `/today`
- **PATCH** `/:id/reschedule`, `/:id/confirm`, `/:id/reject`, `/:id/complete`

### Payments — `/api/payments` (JWT paciente)

- **POST** `/pay` — cobrar cita (Stripe test, una petición)

---

## Tests

```bash
npm test
```

**112 tests unitarios + tests de integración.**

| Archivo | Tipo | Detalle |
|---------|------|---------|
| **Utils** | | |
| `unit/utils/AppError.test.ts` | Unitario | Herencia Error, statusCode, isOperational, stack trace. |
| `unit/utils/ResponseFactory.test.ts` | Unitario | `success()` y `error()` con status y body esperados. |
| `unit/utils/SlotHelper.test.ts` | Unitario | getAllSlots, isValidSlot, isDateInPast, getAvailableSlots (18 tests). |
| **Middlewares** | | |
| `unit/middlewares/roleGuard.test.ts` | Unitario | Sin user → 401, rol incorrecto → 403, rol correcto → next(), multi-rol. |
| **Repositories** | | |
| `unit/repositories/appointment.repository.test.ts` | Unitario | Modelo Mongoose mockeado: CRUD, findByDoctorAndSlot, findOccupiedSlots, etc. (14 tests). |
| `unit/repositories/payment.repository.test.ts` | Unitario | CRUD + findByAppointmentId, findByStripePaymentIntentId (8 tests). |
| `unit/repositories/user.repository.test.ts` | Unitario | CRUD + findByEmail, findDoctors con/sin specialty (9 tests). |
| **Services** | | |
| `unit/appointment.service.test.ts` | Unitario | Validaciones de estado, permisos, conflictos de slot (19 tests). |
| `unit/auth.service.test.ts` | Unitario | Registro, login, JWT, duplicados (6 tests). |
| `unit/payment.service.test.ts` | Unitario | handleSucceeded, payWithStripe y edge-cases con Stripe mock (7 tests). |
| `unit/doctor.service.test.ts` | Unitario | listDoctors, getAvailableSlots (4 tests). |
| `payment.service.test.ts` | Unitario | handleStripePaymentIntentSucceeded aislado (1 test). |
| `slots.test.ts` | Unitario | SlotHelper básico (5 tests). |
| **Controllers** | | |
| `unit/controllers/appointment.controller.test.ts` | Unitario | 7 acciones: create, mine, today, confirm, reject, reschedule, complete. |
| `unit/controllers/payment.controller.test.ts` | Unitario | pay → payWithStripe, responde 201. |
| `unit/controllers/doctor.controller.test.ts` | Unitario | list con/sin specialty, slots. |
| `unit/controllers/auth.controller.test.ts` | Unitario | register → 201, login → 200. |
| **Integración** | | |
| `auth.test.ts` | Integración | Express real + Mongo en memoria + HTTP con `supertest`. |
| `appointments.test.ts` | Integración | Stack completo (HTTP → middleware → service → Mongoose → Mongo en memoria). Stripe mockeado. |

---

## Decisiones técnicas

### TypeScript y contratos

- **Modo estricto** para reducir errores en tiempo de compilación.
- **Interfaces** (`IAppointmentService`, `IAppointmentRepository`, etc.) definen contratos entre capas: los servicios dependen de abstracciones, no de Mongoose directamente, lo que facilita testear y razonar el dominio.

### Arquitectura en capas

- **Controllers** solo traducen HTTP ↔ DTOs; no contienen reglas de negocio.
- **Services** concentran validaciones de dominio (slots, estados de cita, permisos) y orquestan repositorios + Stripe.
- **Repositories** encapsulan consultas y persistencia; el resto del código no conoce detalles de Mongoose más allá de los modelos.
- Objetivo: **un solo lugar** para cada regla de negocio y **bajo acoplamiento** entre capas (alineado con **SOLID**, sobre todo SRP y DIP).

### Autenticación y autorización

- **JWT** en header `Authorization: Bearer` con `sub` (user id) y `role` (`patient` | `doctor`).
- **Middleware** de autenticación + **role guard** por ruta: el mismo token no sirve para endpoints de médico si el usuario es paciente, y viceversa.

### Validación y errores

- **Joi** en body/query/params donde aplica; respuestas de validación coherentes (422).
- **`AppError`** + **middleware global de errores**: mensajes y códigos HTTP predecibles para el cliente y para Swagger.

### Persistencia

- **MongoDB + Mongoose** por flexibilidad de esquema y rapidez de iteración en una demo.
- **Índice único** `(doctorId, date, slot)` para evitar doble reserva del mismo turno.

### Pagos (Stripe)

- **Un solo endpoint** `POST /payments/pay`: crea **PaymentIntent**, usa **`automatic_payment_methods.allow_redirects: 'never'`** para poder confirmar en servidor sin `return_url` (flujo API-only), y confirma con **`pm_card_visa`** en modo test.
- **Solo `sk_test_`** en desarrollo; en **tests** (`NODE_ENV=test`) Stripe está **mockeado** y no se commitean claves en el repo.
- **Trade-off con producción real**: lo habitual sería crear el intent en backend, cobrar con **Stripe.js** en el front y notificar con **webhook**; aquí se priorizó un flujo **cerrado en una petición** para demo sin UI.

### Tests

- **Unitarios (112 tests)**: todas las capas aisladas — utils, middlewares, repositories (modelo Mongoose mockeado), services (repos mockeados), controllers (service mockeado). Sin DB ni HTTP; solo `jest.fn()`.
- **Integración** (`auth`, `appointments`): `supertest` + Express real + `mongodb-memory-server`. Recorren el stack completo (HTTP → middlewares → services → repos → Mongoose). Stripe **mockeado** con `jest.mock`.
- **`mongodb-memory-server`** como entorno: no hace falta tener Mongo instalado para correr la suite.

### Documentación y DX

- **Swagger (OpenAPI 3)** con **swagger-jsdoc**: spec generada desde anotaciones en rutas + schemas en `app.ts`.
- **`security: bearerAuth`** a nivel global para que Swagger UI **envíe el JWT** en “Try it out”; login/register declaran `security: []` para quedar públicos.

### Seguridad operativa

- **Rate limiting** básico por IP para mitigar abuso en endpoints públicos/login.
- **`.env` en `.gitignore`**; secretos solo en entorno local o CI.

### Limitaciones conscientes

- Sin **refresh tokens** ni revocación de sesiones.
- Sin **webhooks** de Stripe ni **idempotency keys** en pagos.
- Sin **paginación** ni **filtros avanzados** en listados.