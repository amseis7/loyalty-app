# Short Code Lookup & WhatsApp Share

**Date:** 2026-06-23  
**Status:** Approved

## Problem

The current admin panel searches customers by phone number, which is slow and error-prone for cashiers. Customers have no easy way to receive or show their loyalty card.

## Solution

- Each customer gets an auto-generated 6-digit numeric `short_code`
- Admin panel becomes a single screen: type code → stamp or register inline
- On registration, cashier sends the card link via WhatsApp in one tap

## Database

New migration `002_short_code.sql`:

```sql
alter table customers
  add column short_code char(6) unique not null
  default lpad((floor(random()*999999)+1)::text, 6, '0');
```

Existing customers receive a code automatically via the column default.

## Admin Panel — Single Screen (`/admin`)

### States

| Input state | UI shown |
|---|---|
| Empty | "Ingresa el código del cliente" |
| 6 digits entered, found | Customer card + Dar sello / Canjear buttons |
| 6 digits entered, not found | Inline registration form |
| After registration | Customer card (0 stamps) + WhatsApp button + Dar sello |

### Search behavior

- `<input type="text" maxlength="6" inputmode="numeric">` — numeric keyboard on mobile
- Auto-submits when 6 characters are entered (no button press needed)
- Server action looks up by `short_code`

### Inline registration form (appears when not found)

Fields: **Nombre** (text), **Teléfono** (tel)  
On submit: creates customer → returns to main state with new customer loaded

### WhatsApp button (shown after registration)

Opens (new tab):
```
https://wa.me/<phone>?text=Hola+<name>,+tu+código+de+fidelidad+es+<short_code>.+Ve+tu+tarjeta+aquí:+<origin>/card/<token>
```

## Removed

- `/admin/customers/new` page — replaced by inline registration on the main panel

## Out of Scope

- QR camera scanning
- SMS/automated sending
- Short code expiration or rotation
