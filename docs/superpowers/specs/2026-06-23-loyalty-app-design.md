# App de Fidelidad de Clientes — Diseño

**Fecha:** 2026-06-23
**Estado:** Aprobado

---

## Resumen

App web de tarjeta de sellos para un café/restaurante de una sola sucursal. El cajero registra clientes por teléfono y agrega sellos desde un panel web. El cliente puede ver su progreso en cualquier momento desde un enlace personal único, sin necesidad de descargar ninguna app.

**Regla de negocio central:** 10 sellos = 1 producto gratis (café u otro item definido por el dueño). Al canjear, la tarjeta se reinicia a 0.

---

## Arquitectura

### Stack tecnológico

| Capa | Tecnología | Motivo |
|---|---|---|
| Frontend | Next.js (React) | Una sola base de código para panel de cajero y vista del cliente |
| Base de datos + Auth | Supabase | Gratuito para este volumen, PostgreSQL, Auth incluido |
| Deploy | Vercel | Deploy automático, dominio personalizado opcional, tier gratuito |

### Componentes del sistema

```
┌─────────────────────────────────────────────┐
│                 Next.js App                  │
│                                             │
│  /admin        Panel de cajero (protegido)  │
│  /card/[token] Tarjeta del cliente (pública)│
│  /admin/login  Inicio de sesión del staff   │
└──────────────┬──────────────────────────────┘
               │
        Supabase API
               │
┌──────────────┴──────────────────────────────┐
│              Base de datos (PostgreSQL)      │
│                                             │
│  customers    redemptions                   │
│  stamps                                     │
└─────────────────────────────────────────────┘
```

---

## Base de datos

### Tabla `customers`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid (PK) | Identificador único |
| `name` | text | Nombre del cliente |
| `phone` | text (unique) | Teléfono (clave de búsqueda) |
| `card_token` | text (unique) | Token para el enlace personal del cliente |
| `created_at` | timestamptz | Fecha de registro |

### Tabla `stamps`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid (PK) | Identificador único |
| `customer_id` | uuid (FK → customers) | A quién pertenece el sello |
| `created_at` | timestamptz | Cuándo se otorgó |
| `added_by` | text | Nombre del cajero que lo agregó |

### Tabla `redemptions`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid (PK) | Identificador único |
| `customer_id` | uuid (FK → customers) | Quién canjeó |
| `redeemed_at` | timestamptz | Cuándo se canjeó |
| `redeemed_by` | text | Cajero que procesó el canje |

### Lógica de sellos activos

Los sellos activos de un cliente se calculan así:
- Contar todos sus `stamps` desde la última `redemption` (o desde el inicio si no hay canjes)
- Si `sellos_activos >= 10` → recompensa disponible

---

## Pantallas y flujos

### Panel del cajero (`/admin`)

**Acceso:** Solo con sesión activa (Supabase Auth). El dueño tiene una cuenta de administrador. Cada cajero tiene su propia cuenta con email (ej: `cajera@tucafe.com`) y contraseña numérica de 4-6 dígitos que funciona como PIN. No hay roles diferenciados en v1 — todos los usuarios autenticados tienen los mismos permisos sobre el panel.

**Pantalla principal:**
1. Campo de búsqueda por número de teléfono
2. Al encontrar cliente: muestra nombre, teléfono, fecha de registro, tarjeta visual de sellos (llenos/vacíos) y contador X/10
3. Botón **"Agregar Sello"** (verde) — acción principal
4. Si sellos activos = 10: el botón cambia a **"Canjear Recompensa"** (dorado)
5. Botón secundario **"Ver historial"** — lista de sellos y canjes del cliente
6. Enlace **"Registrar cliente nuevo"** cuando no se encuentra el teléfono buscado

**Pantalla de registro de cliente nuevo:**
- Campos: Nombre + Teléfono
- Al guardar: redirige de vuelta al perfil del cliente recién creado

**Confirmaciones:**
- Al agregar sello: toast verde "Sello agregado ✓"
- Al canjear: modal de confirmación → "¿Confirmar canje de recompensa para [Nombre]?" → toast "¡Recompensa canjeada! Tarjeta reiniciada."

### Tarjeta del cliente (`/card/[token]`)

**Acceso:** Público. El token en la URL es el único "candado" — quien tenga el enlace puede ver la tarjeta.

**Contenido:**
- Nombre del cliente
- Nombre del negocio (configurado como variable de entorno `NEXT_PUBLIC_BUSINESS_NAME`)
- Grilla visual 2×5 de sellos (íconos de café llenos para sellos ganados, vacíos para los restantes, ícono de regalo para el décimo lugar)
- Contador "X / 10 sellos"
- Texto de progreso: "Te faltan N sellos para tu café gratis"
- Cuando sellos = 10: banner verde "¡Tarjeta completa! Muéstrale esto al cajero"

**No incluye:** historial de visitas, fecha de primer sello, información de contacto del negocio (versión mínima).

---

## Flujos de uso

### Flujo cajero — cliente recurrente

```
Cliente llega y paga
       ↓
Cajero abre /admin en tablet
       ↓
Escribe teléfono del cliente → busca
       ↓
Aparece perfil del cliente
       ↓
¿Sellos activos < 10?
  → Sí: presiona "Agregar Sello" → toast de confirmación ✓
  → No: presiona "Canjear Recompensa" → confirma en modal → tarjeta reinicia a 0
```

### Flujo cajero — cliente nuevo

```
Cliente no tiene tarjeta
       ↓
Cajero escribe teléfono → no se encuentra
       ↓
Click en "Registrar cliente nuevo"
       ↓
Ingresa nombre + teléfono → guarda
       ↓
Aparece perfil nuevo con 0 sellos
       ↓
Cajero agrega el primer sello
       ↓
Cajero comparte el enlace personal al cliente
   (ej: "Guarda este link para ver tus sellos: tucafe.com/card/abc123")
```

### Flujo cliente — ver su tarjeta

```
Cliente abre su enlace personal desde el celular
       ↓
Ve tarjeta con sellos actualizados en tiempo real
       ↓
Si tarjeta completa: muestra banner al cajero para canjear
```

---

## Lo que NO incluye esta versión (v1)

Los siguientes features quedan fuera de scope intencionalmente para mantener la app simple y lanzable rápido:

- Notificaciones automáticas (WhatsApp, SMS, email)
- Panel de estadísticas / reportes de negocio
- Múltiples tipos de recompensa
- Múltiples sucursales
- Programa de referidos
- Login propio del cliente (el enlace único es suficiente)
- App nativa (iOS / Android)

---

## Criterios de éxito

- El cajero puede agregar un sello en menos de 10 segundos
- El cliente puede ver sus sellos sin descargar nada
- El sistema funciona desde cualquier dispositivo moderno con navegador
- El canje de recompensa requiere confirmación explícita del cajero (no accidental)
- Un cliente nuevo puede ser registrado y recibir su primer sello en menos de 30 segundos
