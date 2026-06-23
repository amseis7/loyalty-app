# Deploy — Loyalty App

El código está 100% completo y todos los tests pasan. Solo falta configurar Supabase y hacer deploy a Vercel.

## Paso 1: Configurar Supabase

1. Ve a [supabase.com](https://supabase.com) → crear proyecto nuevo
2. En **Project Settings → API**, copia:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Llena `.env.local` con esos valores (ya existe el archivo con placeholders)
4. Ve a **SQL Editor** → pega el contenido de `supabase/migrations/001_initial_schema.sql` → **Run**
5. Ve a **Authentication → Users → Add user** → crea un usuario por cada cajero (email + contraseña)

## Paso 2: Probar localmente

```bash
npm run dev
```

Abre `http://localhost:3000` → debe redirigir a login → inicia sesión con el usuario que creaste.

## Paso 3: Deploy a Vercel

```bash
# Sube a GitHub primero
git remote add origin https://github.com/TU_USUARIO/loyalty-app.git
git push -u origin main
```

Luego en [vercel.com](https://vercel.com):
1. New Project → importa el repo de GitHub
2. Framework: Next.js (se detecta solo)
3. Agrega las variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_BUSINESS_NAME` = el nombre de tu café
4. Click **Deploy**

## Paso 4: Configurar URL de producción en Supabase

En Supabase → **Authentication → URL Configuration → Redirect URLs** → agrega tu URL de Vercel (ej: `https://tu-app.vercel.app`)

## Estado del proyecto

- ✅ Next.js 16 + TypeScript + Tailwind
- ✅ Supabase Auth + SSR
- ✅ Panel de cajero (`/admin`)
- ✅ Registro de clientes (`/admin/customers/new`)
- ✅ Tarjeta del cliente (`/card/[token]`)
- ✅ 13 tests pasando
- ✅ Build limpio
- ⏳ Deploy pendiente (este archivo)

## Spec y plan de referencia

- Diseño: `docs/superpowers/specs/2026-06-23-loyalty-app-design.md`
- Plan: `docs/superpowers/plans/2026-06-23-loyalty-app.md`
