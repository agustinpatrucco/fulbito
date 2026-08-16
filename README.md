# fulbito

Armador de equipos para los partidos con amigos, al estilo del modo plantilla de EA FC.
Cada amigo es una carta (oro / plata / bronce) y los equipos se arman poniendo cartas en
la cancha.

- Dos equipos de **6** jugadores, con opción a **7**
- Posiciones **POR / DFC / MC / DC**; un jugador fuera de su puesto queda con **contorno rojo**
- Se arman **tocando** las cartas, o **pegando la lista** de WhatsApp
- Fotos de los jugadores subidas desde la misma app
- **Fechas**: creás la próxima con día, hora y cancha (Quintana / Complejo); al cumplirse
  el horario, los equipos quedan bloqueados y pasan al historial
- **Historial**: lineups y resultado de cada fecha jugada, más el récord de victorias de
  cada jugador (total y por cancha)
- **Racha**: dos o más victorias seguidas ponen un 🔥 con el número en la carta

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

**4. Copiá las claves.** *Project Settings* → **API Keys**. Supabase separó esto en dos
secciones — usá la de arriba:

- **Publishable and secret API keys** → copiá la **Publishable key** (es el reemplazo
  de la vieja `anon key`, pensada para ir en el navegador). Va en `VITE_SUPABASE_ANON_KEY`.
- **Legacy anon, service_role API keys** → si tu proyecto todavía tiene la `anon key`
  vieja ahí, también sirve; es funcionalmente igual a la Publishable key.
- **Nunca** uses nada de la sección *Secret* / `service_role` acá — esa clave se salta
  Row Level Security por completo y no debe salir del panel de Supabase.

La URL del proyecto (`VITE_SUPABASE_URL`) no está en esa misma pestaña: buscala en
*Project Settings* → **General** o **Data API**, con el formato
`https://xxxxxxxx.supabase.co`.

Con ambos datos, creá un archivo `.env` en la raíz (usá `.env.example` como molde):

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...   # o sb_publishable_...
VITE_FULBITO_EMAIL=fulbito@fulbito.local
```

Reiniciá `npm run dev`. El cartel de MODO LOCAL desaparece y aparece el botón **Editar**.

### Si ya habías corrido schema.sql antes

Las fechas (`matches`) cambiaron de forma — ahora llevan hora, cancha y resultado en vez
de solo una fecha del día. Si tu proyecto de Supabase ya tenía la tabla vieja (nunca se
llegó a usar, así que no hay datos que perder), corré una vez
[`supabase/migrations/0002_fecha_result.sql`](supabase/migrations/0002_fecha_result.sql)
en el SQL Editor. Un proyecto nuevo no necesita esto — alcanza con `schema.sql`.

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

## Fechas, historial y racha

**Crear una fecha** desde la pestaña Partido: día, hora, cancha (Quintana o Complejo) y
tamaño de equipo. Mientras falte para esa hora, la pestaña Partido muestra esa fecha para
armar los equipos como siempre. En el momento en que se cumple el horario, queda
**bloqueada automáticamente** — no hay ningún botón que apretar — y la pestaña Partido
pasa a mostrar un cartel para cargar el resultado y crear la próxima. Solo puede haber
una fecha "activa" a la vez: la de horario más lejano en el tiempo.

**Cargar el resultado** (goles de cada equipo) se puede hacer apenas la fecha se bloquea,
desde Partido o desde Historial — y corregirlo después si hace falta.

**Historial** lista todas las fechas jugadas con su alineación y resultado, y arriba de
todo el récord de cada jugador: victorias totales, victorias por cancha, y racha actual.

**Racha**: dos o más victorias seguidas ponen un 🔥 con el número en la carta del
jugador, en cualquier pantalla donde aparezca. Un empate o una derrota la corta.

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
  types.ts                    posiciones, categorías, Player, Slot, Match
  config/cardLayout.ts        coordenadas de las cartas  ← ajustar acá
  data/formations.ts          formaciones de 6 y de 7
  lib/supabase.ts             cliente (null = modo local)
  lib/store.ts                CRUD de jugadores, backend intercambiable
  lib/matchStore.ts           CRUD de fechas y alineaciones, backend intercambiable
  lib/auth.ts                 login con la contraseña compartida
  features/players/           carta, formulario, plantel, subida de fotos
  features/squad/             cancha, banco, tap-to-assign
  features/matches/           fecha, bloqueo, resultado, historial, racha (con tests)
  features/import/            parser + matcher de la lista pegada (con tests)
supabase/schema.sql                          tablas, RLS y bucket de fotos (proyecto nuevo)
supabase/migrations/0002_fecha_result.sql     al día la tabla matches (proyecto existente)
```
