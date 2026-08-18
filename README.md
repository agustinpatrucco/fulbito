# fulbito

Armador de equipos para los partidos con amigos, al estilo del modo plantilla de EA FC.
Cada amigo es una carta (oro / plata / bronce) y los equipos se arman poniendo cartas en
la cancha.

- **Grupos**: cada grupo de amigos tiene su propio Plantel/Partido/Historial, separado
  del resto, y se accede con un código de 6 caracteres — nada de esto es buscable
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

## Conectar Supabase (para que los grupos sigan entre dispositivos)

**1. Creá el proyecto.** En [supabase.com](https://supabase.com) → *New project* (plan
gratis). Anotá la contraseña de la base cuando te la pida.

**2. Creá las tablas.** En el panel: *SQL Editor* → *New query* → pegá todo el contenido
de [`supabase/schema.sql`](supabase/schema.sql) → *Run*. Eso crea las tablas (incluida
`groups`), activa Row Level Security y crea el bucket de fotos.

**3. Copiá las claves.** *Project Settings* → **API Keys**. Supabase separó esto en dos
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
```

Reiniciá `npm run dev`. El cartel de MODO LOCAL desaparece.

### Si ya habías corrido schema.sql antes

Corré, en orden, los archivos de `supabase/migrations/` que todavía no hayas corrido:

1. [`0002_fecha_result.sql`](supabase/migrations/0002_fecha_result.sql) — las fechas
   (`matches`) pasan a llevar hora, cancha y resultado.
2. [`0003_open_writes.sql`](supabase/migrations/0003_open_writes.sql) — abre los writes
   a cualquiera con el link (ver "Sobre la seguridad").
3. [`0004_groups.sql`](supabase/migrations/0004_groups.sql) — agrega los Grupos y migra
   todo lo que ya tenías a uno con código `consti`. **Antes de correrlo**, revisá el
   comentario cerca del final del archivo: hay un `update` que marca como admin al
   jugador cuyo nombre matchee `%patrucco%` — confirmá que le pega a un solo jugador
   (con el `select` que está comentado justo arriba) antes de correr el `update`.

Un proyecto nuevo no necesita ninguna de las tres — alcanza con `schema.sql`.

### Sobre la seguridad

Dentro de un grupo, cualquiera con su código puede **ver y modificar** el plantel, las
fechas y los resultados — eso lo permite Row Level Security del lado del servidor, no
algo que haga el navegador. No hay una cuenta por persona: alguien "inicia sesión"
simplemente eligiendo su propio nombre en Plantel (o creándose si es nuevo), sin
contraseña, así que no hay ningún token de Supabase distinto por persona contra el cual
chequear un `insert` o un `delete`. El primer jugador creado en un grupo queda marcado
como su admin — es lo único que distingue permisos dentro de un grupo (crear/eliminar
jugadores, agregar partidos anteriores), y es un flag del lado del cliente, no algo que
Row Level Security verifique.

Lo que sí está protegido de verdad es **encontrar** un grupo: la tabla `groups` no es
legible ni escribible directamente por nadie — la única puerta de entrada son las
funciones `get_group_by_code`/`create_group` (ver `schema.sql`), que hacen una búsqueda
exacta por código. No hay ningún endpoint que permita listar o adivinar todos los
códigos que existen.

Por eso la `anon key` puede ir en el bundle sin problema — está pensada para ser
pública. Lo que **nunca** hay que publicar es la `service_role key`.

---

## Publicar en Netlify

1. Subí el repo a GitHub.
2. En Netlify: *Add new site* → *Import an existing project* → elegí el repo.
   El `netlify.toml` ya trae el comando (`npm run build`), la carpeta (`dist`) y el
   redirect de SPA, así que no hay que tocar nada.
3. *Site configuration* → *Environment variables*: agregá las mismas dos variables
   `VITE_...` del `.env`.
4. *Deploys* → *Trigger deploy* para que tome las variables.

> Si no cargás las variables el sitio igual funciona, pero arranca en modo local y cada
> dispositivo ve su propio grupo, sin compartir nada entre sí.

Tu link de siempre sigue funcionando: agregale `/consti` para volver al grupo
migrado — por ejemplo `fulbo-pibes.netlify.app/consti`.

---

## Las cartas

Los fondos viven en `public/cards/` como `gold.png`, `silver.png` y `bronze.png`.

Para alinear el nombre y las posiciones con el diseño, editá
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

## Grupos

Cada grupo de amigos tiene su propio Plantel, Partido e Historial, separado del resto.
No hay forma de buscarlos ni listarlos — para entrar a uno hace falta su código de 6
caracteres, y se accede en `tu-sitio.netlify.app/<código>` (por ejemplo,
`fulbo-pibes.netlify.app/consti`).

Sin código en la URL, la app muestra dos opciones:

- **Crear grupo nuevo**: genera un código al azar y te deja ahí — compartiselo a tus
  amigos para que se unan.
- **Unite con un código**: si ya tenés uno.

Una vez dentro de un grupo, no hay ningún selector para volver a otro — se accede
revisitando su URL (guardala o mandátela a vos mismo).

---

## Iniciar sesión

Dentro de un grupo, si no elegiste todavía quién sos, el cartel para hacerlo aparece
solo. Dos caminos:

- **Elegir tu jugador**: tocás tu propia carta en la lista, sin contraseña. Desde ahí
  podés editar tu carta (pestaña **Mi perfil**), crear fechas, armar los equipos
  (tocando o pegando la lista) y cargar resultados.
- **+ Crear jugador**: si sos nuevo en el grupo, creá tu carta ahí mismo. El primer
  jugador creado en un grupo recién creado queda marcado automáticamente como su
  **admin** — solo un admin puede crear/eliminar otros jugadores, editar la carta de
  cualquiera (no solo la propia), y agregar partidos anteriores al historial.

La sesión queda guardada en el dispositivo, separada por grupo — elegir tu jugador en
uno no afecta a los demás grupos a los que te hayas unido.

---

## Fechas, historial y racha

**Crear una fecha** desde la pestaña Partido: día, hora, cancha (Quintana o Complejo) y
tamaño de equipo. Mientras falte para esa hora, la pestaña Partido muestra esa fecha para
armar los equipos como siempre. En el momento en que se cumple el horario, queda
**bloqueada automáticamente** — no hay ningún botón que apretar — y la pestaña Partido
pasa a mostrar un cartel para cargar el resultado y crear la próxima. Solo puede haber
una fecha "activa" a la vez: la de horario más lejano en el tiempo.

En cualquier fecha, la hora solo admite minutos **00, 15, 30 o 45**.

**Agregar un partido anterior** (solo admin) desde Historial, con
**+ Agregar partido anterior** — para cargar partidos jugados antes de usar la app. Pide
lo mismo que crear una fecha, pero al revés: la fecha tiene que ser de hoy o antes. Al
crearlo se abre directamente **Pegar lista** para cargar las alineaciones, y después
queda listo para cargarle el resultado ahí mismo en Historial. El mismo botón **Pegar
lista** también está disponible en cualquier fecha ya bloqueada, por si hace falta
cargar o corregir una alineación más tarde.

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
  types.ts                    posiciones, categorías, Player, Slot, Match, Group
  config/cardLayout.ts        coordenadas de las cartas  ← ajustar acá
  data/formations.ts          formaciones de 6 y de 7
  lib/supabase.ts             cliente (null = modo local)
  lib/group.ts                resuelve el código de grupo de la URL (crear/unirse)
  lib/store.ts                CRUD de jugadores, backend intercambiable, por grupo
  lib/matchStore.ts           CRUD de fechas y alineaciones, backend intercambiable, por grupo
  lib/playerSession.ts        login como jugador (elegís o creás tu carta), por grupo
  features/group/             pantalla de crear/unirse a un grupo
  features/players/           carta, formulario, plantel, mi perfil, subida de fotos
  features/squad/             cancha, banco, tap-to-assign
  features/matches/           fecha, bloqueo, resultado, historial, racha (con tests)
  features/import/            parser + matcher de la lista pegada (con tests)
supabase/schema.sql                          tablas, RLS, RPCs y bucket de fotos (proyecto nuevo)
supabase/migrations/0002_fecha_result.sql     al día la tabla matches (proyecto existente)
supabase/migrations/0003_open_writes.sql      abre los writes a cualquiera con el link
supabase/migrations/0004_groups.sql           agrega Grupos y migra todo a "consti"
```
