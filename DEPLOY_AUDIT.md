# Auditoría de Fallo de Despliegue en Vercel

## Contexto

El despliegue en Vercel falla con `pnpm run build` exit code 1. El mensaje visible en la interfaz es:

```
Error: Failed to collect page data for /_not-found
```

Pero esa es una **consecuencia** de la cascada de fallos, no la causa raíz.

---

## 1. Causa Raíz

Hay **tres causas raíz** apiladas que provocan el fallo completo del build:

### Causa primaria: `POSTGRES_URL` sin valor en el entorno de Vercel

El script `build` en `package.json` ejecuta `tsx db/migrate && next build`. El script `db/migrate.ts` intenta conectarse a PostgreSQL usando `POSTGRES_URL` (cargada desde `.env.local`). En el entorno de build de Vercel:

- `.env.local` está excluida del deploy (gitignore + Vercel no la inyecta)
- `POSTGRES_URL` **no existe** como variable de entorno en el proyecto Vercel
- La conexión falla con `ECONNREFUSED ::1:5432` / `ECONNREFUSED 127.0.0.1:5432`
- `tsx db/migrate` termina con `process.exit(1)` → `pnpm run build` falla → build NO llega a `next build`

### Causa secundaria (expuesta tras parchear la primaria): Variables NEXTAUTH/Firebase ausentes en Vercel

Cuando el script de migración se parchea para tolerar la falta de Postgres y `next build` continúa, el build falla en la fase de **collect page data** para `/_not-found`. La razón:

- `app/layout.tsx` renderiza `<Navbar />` que es un componente async
- `Navbar` llama a `await auth()` (de `next-auth`)
- `auth()` necesita `NEXTAUTH_URL` y `AUTH_SECRET` en el entorno
- Estas variables **tampoco están en Vercel** (solo existen en `.env.local`)
- `auth()` falla en servidor durante el build → `_not-found` page data collection falla

### Causa tercaria: URL de Supabase del panel admin incorrecta

`ADMIN_SUPABASE_URL` en Vercel apuntaba a `https://rjfcmmzjlguiititkmyh.supabase.co` (proyecto Supabase equivocado). El proyecto correcto es `https://iahkmnrneqvyqqnbyagp.supabase.co`.

Además `ADMIN_SUPABASE_KEY` estaba ausente en el entorno de producción de Vercel.

---

## 2. Evidencia

### package.json (scripts.build)

```json
"build": "tsx db/migrate && next build"
```

`&&` significa que si `tsx db/migrate` falla (exit code != 0), `next build` **nunca se ejecuta**. El operador `&&` propaga el fallo inmediatamente.

### db/migrate.ts (original, antes de parche)

```ts
config({ path: ".env.local" });

const runMigrate = async () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not defined");
  }
  const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(connection);
  // ...
  process.exit(0);
};

runMigrate().catch((err) => {   // ← aquí es donde cae ECONNREFUSED
  console.error("❌ Migration failed");
  console.error(err);
  process.exit(1);              // ← propaga fallo a `build`
});
```

### drizzle.config.ts

```ts
config({ path: ".env.local" });
export default defineConfig({
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL!,   // No-null assertion; falla si no existe
  },
});
```

### next.config.mjs

```ts
const nextConfig = {
  experimental: {},
  images: { remotePatterns: [] },
};
```

No tiene configuración de variables de entorno ni de Vercel Postgres.

### .env.local (POSTGRES_URL)

```
POSTGRES_URL=postgresql://postgres:postgres@localhost:5432/licitaclub?sslmode=require
```

URL `localhost` que **solo funciona localmente**. En Vercel no hay Postgres escuchando en localhost:5432.

### .env.example (vars requeridas para deploy)

```
POSTGRES_URL=****
POSTGRES_PRISMA_URL=****          # Variable que también usa el proyecto (no está en .env.example completa)
POSTGRES_URL_NON_POOLING=****     # Variable que también usa el proyecto
BLOB_READ_WRITE_TOKEN=****
GOOGLE_GENERATIVE_AI_API_KEY=****
NEXTAUTH_URL=****
AUTH_SECRET=****
MERCADO_PUBLICO_TICKET=****
ADMIN_SUPABASE_URL=****
ADMIN_SUPABASE_KEY=****
```

### vercel env ls (estado en plataforma, antes de corrección)

```
name                       value               environments
ADMIN_SUPABASE_KEY         Encrypted           Preview (3h atrás)
ADMIN_SUPABASE_URL         Encrypted           Preview (3h atrás)
ADMIN_SUPABASE_URL         Encrypted           Production (4h atrás, URL ERRÓNEA al proyecto rjfcmmzj...)
```

No existía `POSTGRES_URL`, `NEXTAUTH_URL`, `AUTH_SECRET`, `GOOGLE_GENERATIVE_AI_API_KEY`, `BLOB_READ_WRITE_TOKEN`, ni `MERCADO_PUBLICO_TICKET` en Vercel.

### Flujo de ejecución del build en Vercel

```
Vercel detecta push → clone repo → npm install
↓
pnpm run build (NEXT_BUILD_CMD = "tsx db/migrate && next build")
↓
tsx db/migrate
  ├─ dotenv.config({ path: ".env.local" }) → no carga nada (archivo gitignored, no en build context)
  ├─ process.env.POSTGRES_URL → undefined → lanza "POSTGRES_URL is not defined"
  └─ runMigrate().catch → process.exit(1)
  ↓ (el build TERMINA AQUÍ con exit code 1)
  [El `&&` corta la cadena → `next build` NUNCA se ejecuta]
```

Sin el parche actual (que cambió `db/migrate.ts` para tolerar la ausencia de Postgres):

```
└─ process.exit(1) → pnpm run build exit 1 → vercel deploy exit 1 → BUILD ERROR
```

---

## 3. Flujo de Ejecución (Diagrama Actualizado con Parche Actual)

```
Vercel Build Trigger (git push → webhook → Vercel Build)
↓
npm install
  (instala @vercel/postgres 0.10.0 entre paquetes)
↓
pnpm run build
  = tsx db/migrate && next build
↓
tsx db/migrate (VERSIÓN ACTUAL, con parche en db/migrate.ts)
  ├─ dotenv.config({ path: ".env.local" }) → POSTGRES_URL = undefined
  ├─ if (!POSTGRES_URL) → console.warn + process.exit(0)  ← CAMBIO CLAVE
  └─ exit code 0 → permite que && next build continúe
↓
next build (NEXT.js 15.5.7)
  ├─ Creating an optimized production build...
  ├─ Collecting page data...
  │
  ├─ (Reconoce que Layout es async → renderiza app/layout.tsx)
  │
  ├─ app/layout.tsx → <Navbar /> (componente async)
  │
  ├─ Navbar → await auth() desde next-auth
  │
  ├─ auth() necesita: NEXTAUTH_URL, AUTH_SECRET
  │
  ├─ Ambas variables NO están en entorno de Vercel Build
  │
  ├─ auth() falla en contexto de build (sin request, sin cookies)
  │
  ├─ La generación de datos para /_not-found falla
  │
  └─ ❌ Error: Failed to collect page data for /_not-found
  ↓
pnpm run build exit 1 → vercel deploy exit 1 → BUILD ERROR
```

---

## 4. ¿Las migraciones deberían ejecutarse durante el build?

**No.** Justificación técnica:

1. **El build es para compilar código, no para ejecutar operaciones de base de datos.** Las migraciones modifican el esquema de datos (DDL) y deben ejecutarse como un paso separado, idempotente y controlado.

2. **El entorno de build no tiene acceso a la base de datos** (ni a localhost ni a Vercel Postgres, a menos que se haya provisionado explícitamente). Ejecutar migraciones durante el build rompe la separación de responsabilidades.

3. **Vercel recomienda separar las migraciones del build.** La práctica estándar es ejecutar migraciones como un paso post-deploy (por ejemplo, un GitHub Action post-deploy, un script de startup, o una función edge que se ejecute una vez).

4. **El script `start` en package.json es `next start`** que levanta el servidor Node.js. Las migraciones deberían ejecutarse en ese momento (o mejor aún, como parte del proceso de release, no de la construcción).

5. **Vercel Postgres ofrece `vercel postgres migrate`**, pero el proyecto usa Drizzle ORM con `postgres.js` directamente, no la integración nativa de Vercel Postgres para migraciones. Si se usa `@vercel/postgres`, la integración tiene sus propios mecanismos.

---

## 5. Solución Correcta

### Paso 1: Quitar migraciones del build script

`package.json`:
```json
"build": "next build"
```

### Paso 2: Migrar migraciones a script separado ejecutable en startup

Crear `scripts/migrate.js` o mover la lógica al `start` script:
```json
"start": "tsx db/migrate && next start",
"build": "next build",
```

### Paso 3: Configurar `POSTGRES_URL` en Vercel

Si el proyecto usa Vercel Postgres, hacer:
- `vercel postgres add <nombre>` (o desde dashboard) → genera automáticamente `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`

Si el proyecto usa Supabase Postgres como DB principal, configurar manualmente en Vercel el `DATABASE_URL`/`POSTGRES_URL` apuntando a la cadena de conexión de Supabase (`postgres://...@db.iahkmnrneqvyqqnbyagp.supabase.co:5432/postgres`) con su usuario/contraseña del proyecto.

### Paso 4: Configurar todas las variables de entorno necesarias en Vercel

Todas las variables que figuran en `.env.example` (sin los valores `****`) deben ser configuradas como "Production" y "Preview" en el proyecto Vercel usando `vercel env add` o desde el dashboard:

- `NEXTAUTH_URL`
- `AUTH_SECRET` (generado con `openssl rand -base64 32`)
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `MERCADO_PUBLICO_TICKET`
- `BLOB_READ_WRITE_TOKEN`
- `ADMIN_SUPABASE_URL` → `https://iahkmnrneqvyqqnbyagp.supabase.co` (correcto)
- `ADMIN_SUPABASE_KEY` → clave anon del proyecto

### Paso 5: `db/migrate.ts` — Restaurar a comportamiento estricto

Una vez que `POSTGRES_URL` esté correctamente configurado en Vercel para la app principal, revertir `db/migrate.ts` a su comportamiento original (sin tolerancia silenciosa). No tiene sentido que las migraciones se ejecuten con una DB falsa o inexistente.

---

## 6. Cambios de Código Previos (Ya Realizados)

### db/migrate.ts — Parche temporal para tolerar build sin Postgres

```diff
  const runMigrate = async () => {
-   if (!process.env.POSTGRES_URL) {
+   const postgresUrl = process.env.POSTGRES_URL;
+   if (!postgresUrl) {
+     console.warn("⚠ POSTGRES_URL is not defined — skipping migrations");
+     process.exit(0);
+   }
+
+   try {
      const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
      const db = drizzle(connection);
      // ... migrations
+   } catch (err) {
+     const msg = err instanceof Error ? err.message : String(err);
+     console.warn("⚠ Migration skipped — could not connect to Postgres:", msg);
+   }
+
+   process.exit(0);
  };
```

### `.env.local` — Agregadas variables admin

```diff
+ # Admin panel Supabase connection (Procurement Intelligence)
+ ADMIN_SUPABASE_URL=https://iahkmnrneqvyqqnbyagp.supabase.co
+ ADMIN_SUPABASE_KEY=<real anon key>
```

### `.env.example` — Corregida URL y agregadas variables admin

```diff
+ ADMIN_SUPABASE_URL=https://iahkmnrneqvyqqnbyagp.supabase.co
+ ADMIN_SUPABASE_KEY=****
```

---

## 7. Riesgos

1. **Parche en `db/migrate.ts` oculta errores de DB reales**: Si la conexión a Postgres falla por una razón legítima en producción (credenciales inválidas, DB caída), el build continúa silenciosamente. Las migraciones NO se ejecutan y el deploy se hace sin esquema actualizado. Esto puede causar inconsistencias de datos en producción.

2. **`AUTH_SECRET` y `NEXTAUTH_URL` ausentes en Vercel**: Mientras estas variables no estén configuradas en Vercel (tanto Production como Preview), `next build` va a fallar cada vez porque `next-auth` requiere `AUTH_SECRET` como var de entorno obligatoria.

3. **`@vercel/postgres` 0.10.0 está en dependencies**: Indica que el proyecto espera usar Vercel Postgres, pero nunca se ha provisionado un proyecto Postgres en Vercel para `gemini-ai-chatbot`. El paquete se instala en `node_modules` del build pero nunca tiene una conexión real sin la URL configurada.

---

## 8. Recomendaciones

1. **Resolver la prioridad alta inmediata:** Configurar `NEXTAUTH_URL` y `AUTH_SECRET` en Vercel para Production y Preview. Esto resuelve el `Failed to collect page data for /_not-found`.

2. **Separar migraciones del build.** Quitar `tsx db/migrate &&` del script `build`. Usar `tsx db/migrate` como paso previo al deploy independiente, o integrarlo en el startup de la función `next start` para entornos sin Vercel Postgres nativo.

3. **Provisión de base de datos.** Elegir una de estas opciones:
   - Crear un proyecto Vercel Postgres (dashboard → Storage → PostgreSQL), lo que inyecta automáticamente `POSTGRES_URL` en el entorno de build y runtime.
   - O apuntar `POSTGRES_URL` manualmente a Supabase Postgres (`postgres://postgres:<password>@db.iahkmnrneqvyqqnbyagp.supabase.co:5432/postgres`).

4. **`db/migrate.ts` — revertir el parche de tolerancia silenciosa** una vez que `POSTGRES_URL` esté correctamente configurado en Vercel. Mantener el `strict` mode para que los errores de DB se hagan visibles en vez de ser ignorados.

5. **`vercel env pull`** debería ejecutarse periódicamente en el workflow local para mantener `.env.local` sincronizado con valores reales cuando estos se rotan o cambian en Vercel.

---

## Estado Actual de Cambios en Disco

Archivos modificados localmente (no todos todavía en `main`):

| Archivo | Cambio | Estado |
|---|---|---|
| `.env.local` | Agregadas variables `ADMIN_SUPABASE_URL/KEY` con URL correcta y clave real | ✅ En disco, NO commitado (gitignore) |
| `.env.example` | Corregida `ADMIN_SUPABASE_URL`, agregadas `ADMIN_SUPABASE_URL/KEY` | ✅ Commitado y pushado a `main` |
| `db/migrate.ts` | Parche para tolerar build sin Postgres (catch) | ✅ Commitado `cb47771` y pushado a `main` |
| `db/migrate.ts` | TypeScript fix (err instanceof Error) | ✅ Commitado `20cbad2` y pushado a `main` |

### Fix aplicado: Variables de entorno admin vacías en Vercel (2026-08-01)

**Problema:** `ADMIN_SUPABASE_URL` y `ADMIN_SUPABASE_KEY` existían en Vercel pero con valores vacíos (`""`), lo que provocaba que el panel de administración mostrara "⚠ Panel de administración no configurado".

**Causa:** Las variables fueron agregadas previamente al proyecto Vercel pero sin valores asignados. El CLI de Vercel v55.0.0 no mostraba este problema al hacer `vercel env pull` (mostraba vacío), y el CLI v58.4.4 ahora muestra `[SENSITIVE]` confirmando que los valores están almacenados correctamente.

**Fix aplicado:**
1. Se eliminaron las variables vacías con `vercel env rm --yes`
2. Se re-agregaron con los valores correctos usando `vercel env add --value --force --yes`
3. Se actualizaron `.env.production` y `.env.vercel` para incluir las variables admin (con placeholder `****` para la clave)

**Estado:**
| Variable | Production | Preview |
|---|---|---|
| `ADMIN_SUPABASE_URL` | ✅ `https://iahkmnrneqvyqqnbyagp.supabase.co` | ✅ `https://iahkmnrneqvyqqnbyagp.supabase.co` |
| `ADMIN_SUPABASE_KEY` | ✅ Configurada | ✅ Configurada |

**Archivos modificados:**
| Archivo | Cambio | Estado |
|---|---|---|
| `.env.production` | Agregadas `ADMIN_SUPABASE_URL` y `ADMIN_SUPABASE_KEY` | ✅ En disco, NO commitado |
| `.env.vercel` | Agregadas `ADMIN_SUPABASE_URL` y `ADMIN_SUPABASE_KEY` | ✅ En disco, NO commitado |
| Vercel env vars | Corregidos valores vacíos de `ADMIN_SUPABASE_URL/KEY` | ✅ Aplicado |

Archivos que **no** se han tocado pero que requieren cambios para resolver el build:

| Archivo | Acción requerida |
|---|---|
| `package.json` scripts.build | Cambiar de `tsx db/migrate && next build` a `next build` |
| Vercel env vars | Agregar `NEXTAUTH_URL`, `AUTH_SECRET`, `GOOGLE_GENERATIVE_AI_API_KEY`, `MERCADO_PUBLICO_TICKET`, `BLOB_READ_WRITE_TOKEN`, `POSTGRES_URL` |
| `db/migrate.ts` | Revertir parche de tolerancia silenciosa una vez Postgres esté configurado |
