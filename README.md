# fulbito

Armador de equipos para los partidos con amigos, al estilo del modo plantilla de EA FC.
Cada amigo es una carta (oro / plata / bronce) y los equipos se arman poniendo cartas en
la cancha.

- Dos equipos de **6** jugadores, con opción a **7**
- Posiciones **POR / DFC / MC / DC**; un jugador fuera de su puesto queda con **contorno rojo**
- Se arman **tocando** las cartas, o **pegando la lista** de WhatsApp
- Fotos de los jugadores subidas desde la misma app

---

## Arrancar en local

```bash
npm install
```

```bash
npm run dev
```

Sin configurar nada, la app arranca en **MODO LOCAL**: todo se guarda en el navegador.
Sirve para probar, pero los datos no se comparten entre la compu y el teléfono. Para eso,
seguí los pasos de abajo.

---

## Conectar Supabase (para que el plantel te siga entre dispositivos)

**1. Creá el proyecto.** En [supabase.com](https://supabase.com) → *New project* (plan
gratis). Anotá la contraseña de la base cuando te la pida.

**2. Creá las tablas.** En el panel: *SQL Editor* → *New query* → pegá todo el contenido
de [`supabase/schema.sql`](supabase/schema.sql) → *Run*. Eso crea las tablas, activa Row
Level Security y crea el bucket de fotos.

**3. Creá el único usuario.** *Authentication* → *Users* → *Add user* → *Create new user*:

- Email: `fulbito@fulbito.local`
- Password: la contraseña compartida que vas a usar en la app
- Tildá **Auto Confirm User** (si no, Supabase espera una confirmación por mail que nunca va a llegar)

**4. Copiá las claves.** *Project Settings* → *API*. Creá un archivo `.env` en la raíz
(usá `.env.example` como molde):

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_FULBITO_EMAIL=fulbito@fulbito.local
```

Reiniciá `npm run dev`. El cartel de MODO LOCAL desaparece y aparece el botón **Editar**.

### Sobre la seguridad

Cualquiera con el link puede **ver** el plantel; solo quien tenga la contraseña puede
**modificarlo**. Eso lo garantiza Row Level Security del lado del servidor, no el
navegador: aunque alguien abra la consola, sin el token de Supabase los `insert` y
`delete` fallan.

Por eso la `anon key` puede ir en el bundle sin problema — está pensada para ser pública.
Lo que **nunca** hay que publicar es la `service_role key`.

---

## Publicar en Netlify

1. Subí el repo a GitHub.
2. En Netlify: *Add new site* → *Import an existing project* → elegí el repo.
   El `netlify.toml` ya trae el comando (`npm run build`), la carpeta (`dist`) y el
   redirect de SPA, así que no hay que tocar nada.
3. *Site configuration* → *Environment variables*: agregá las mismas tres variables
   `VITE_...` del `.env`.
4. *Deploys* → *Trigger deploy* para que tome las variables.

> Si no cargás las variables el sitio igual funciona, pero arranca en modo local y cada
> dispositivo ve su propio plantel.

---

## Las cartas

Poné tus fondos en `public/cards/` como `gold.png`, `silver.png` y `bronze.png`
(3:4, ~600×800). Hasta que existan, la app usa degradados de reemplazo.

Para alinear el nombre y las posiciones con tu diseño, editá
**`src/config/cardLayout.ts`** — está todo en porcentajes y es el único archivo que hay
que tocar.

---

## Pegar la lista

Formato esperado (los títulos pueden ser `EQUIPO 1`/`TEAM A`, en cualquier mayúscula):

```
EQUIPO 1
- Nico
- Juanchi
- Fede Gomez

EQUIPO 2
- Agus
- Tomi
- Santi
```

El buscador aguanta apodos, apellidos sueltos, tildes faltantes y errores de tipeo, e
ignora emojis y aclaraciones entre paréntesis. Si no encuentra los títulos y la lista
tiene cantidad par, la parte al medio y te avisa.

Cada fila se puede corregir a mano; cuando corregís una, ese texto queda guardado como
alias del jugador y la próxima vez se reconoce solo. Un nombre que no exista se puede
crear en el momento con **Crear**.

---

## Comandos

```bash
npm run dev
```

```bash
npm test
```

```bash
npm run build
```

---

## Estructura

```
src/
  types.ts                    posiciones, categorías, Player, Slot
  config/cardLayout.ts        coordenadas de las cartas  ← ajustar acá
  data/formations.ts          formaciones de 6 y de 7
  lib/supabase.ts             cliente (null = modo local)
  lib/store.ts                CRUD con backend intercambiable
  lib/auth.ts                 login con la contraseña compartida
  features/players/           carta, formulario, plantel, subida de fotos
  features/squad/             cancha, banco, ubicación automática
  features/import/            parser + matcher de la lista pegada (con tests)
supabase/schema.sql           tablas, RLS y bucket de fotos
```
