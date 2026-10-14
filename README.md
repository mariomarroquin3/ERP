# ERP Maquila

ERP para la gestión de producción, pedidos, facturación y capacidad de taller en maquila textil.
Frontend en React + Vite, backend en Express (`server.ts`) y base de datos PostgreSQL en **Supabase**.

## Requisitos

- Node.js 20 o superior
- Un proyecto de Supabase (gratuito sirve para empezar)

## 1. Crear la base de datos en Supabase

El esquema completo está en `supabase/migrations/`. Aplíquelo de una de estas dos formas:

**Con la CLI de Supabase**

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

**Sin CLI:** abra el *SQL Editor* del panel de Supabase, pegue el contenido de
`supabase/migrations/20261014000000_initial_schema.sql` y ejecútelo.

La migración crea todas las tablas, índices y catálogos base (roles, estados, etapas, tallas y permisos).
Todas las tablas tienen Row Level Security activado sin políticas: la API pública de Supabase
(llaves `anon` / `authenticated`) no puede leer ni modificar datos. Solo el backend, que se conecta
directamente a Postgres, tiene acceso.

## 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Complete como mínimo:

| Variable | Dónde obtenerla |
| --- | --- |
| `DATABASE_URL` | Panel de Supabase > **Connect** > *Session pooler*. Reemplace `[YOUR-PASSWORD]`. |
| `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | El primer administrador; se crea al arrancar si no existe ninguno. |

## 3. Ejecutar

```bash
npm install
npm run dev        # desarrollo (http://localhost:3000)
```

Producción:

```bash
npm run build
NODE_ENV=production npm start
```

En producción el servidor se niega a arrancar si faltan `DATABASE_URL` o `JWT_SECRET`.

### Modo sandbox (sin base de datos)

Si `DATABASE_URL` está vacío y no es producción, el servidor usa una base de datos en memoria con datos
de ejemplo (se pierden al reiniciar). Usuarios de prueba: `admin@maquila.com` / `admin123`,
`tienda@maquila.com` / `tienda123`, `taller@maquila.com` / `taller123`, `cliente@maquila.com` / `cliente123`,
`operario@maquila.com` / `operario123`.

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor Express con Vite en modo desarrollo |
| `npm run build` | Compila el frontend y el servidor en `dist/` |
| `npm start` | Ejecuta el build de producción |
| `npm run lint` | Verificación de tipos con TypeScript |
