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

**mongodb-memory-server** + mock de Stripe en tests de citas.

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

- **`mongodb-memory-server`**: suite aislada sin depender de una Mongo instalada.
- Tests de flujo de citas **mockean** la API de Stripe para no pegarle a Stripe ni filtrar secretos.

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