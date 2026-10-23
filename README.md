# Scrim Maníacos

Plataforma competitiva de **Pokémon UNITE** y **Pokémon Champions** para Latinoamérica: perfiles de jugadores, equipos, torneos con sorteo de bracket, scrims, publicación de resultados y ranking.

Todo funciona con servicios **gratuitos**:

| Pieza | Servicio | Plan |
|---|---|---|
| Web (Next.js) | Vercel | Hobby (gratis) |
| Base de datos y login con Google | Supabase | Free |
| Dominio `scrimmaniacos.com` | Namecheap | ya comprado |

## Qué incluye

- **Login con Google (Gmail)**: el perfil se crea solo al entrar por primera vez.
- **Perfiles**: nick, usuario, país, juego principal, rol en UNITE, ID de entrenador y biografía.
- **Equipos**: el creador es el capitán, invita con un código o enlace, cambia titulares y suplentes y expulsa integrantes. Cada jugador puede estar en un solo equipo por juego.
- **Torneos** (los crean los administradores):
  - Modalidad por equipos (UNITE exige al menos 5 integrantes) o individual (Champions).
  - Eliminación simple en Bo1, Bo3, Bo5 o Bo7.
  - **Sorteo aleatorio del bracket** con pases directos (byes) repartidos en el cuadro.
- **Resultados**: un participante reporta (con un enlace a la captura, opcional) y el rival confirma o abre una disputa, que resuelve un admin. El ganador avanza solo de ronda.
- **Scrims**: publicar una búsqueda de rival, aceptarla, publicar el marcador o cancelarla. Las horas se muestran en la zona horaria de cada visitante.
- **Ranking por juego**: 3 puntos por serie ganada en torneos y 10 por título.
- **Panel de admin** con las disputas abiertas.

La seguridad está dentro de la base de datos (Row Level Security y funciones). Nadie puede darse permisos de admin, reportar partidas ajenas ni confirmar su propio resultado, aunque manipule la web.

---

## Puesta en marcha (unos 30 minutos)

### 1. Crear el proyecto en Supabase

1. Entra a <https://supabase.com>, crea una cuenta y luego **New project**. La región más cercana para LATAM suele ser *South America (São Paulo)*.
2. Ve a **SQL Editor → New query**, pega todo el archivo [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**.
3. En **Project Settings → API** copia la **Project URL** y la **anon / publishable key**.

### 2. Activar el login con Google

Si ya tenías creado un cliente OAuth en Google Cloud, puedes reutilizarlo. Solo tienes que agregar la URL de redirección de Supabase.

1. En [Google Cloud Console](https://console.cloud.google.com/) → **APIs y servicios → Credenciales** → **Crear credenciales → ID de cliente de OAuth** (tipo *Aplicación web*).
2. En **URI de redireccionamiento autorizados** agrega:
   `https://TU-PROYECTO.supabase.co/auth/v1/callback`
3. Copia el *Client ID* y el *Client Secret*.
4. En Supabase → **Authentication → Sign In / Providers → Google**: actívalo y pega ambos valores.
5. En Supabase → **Authentication → URL Configuration**:
   - **Site URL**: `https://scrimmaniacos.com`
   - **Redirect URLs**: `https://scrimmaniacos.com/**` y `http://localhost:3000/**`

### 3. Publicar en Vercel

1. Entra a <https://vercel.com> con tu cuenta de GitHub → **Add New → Project** → importa `scrimmaniacos-web`.
2. En **Environment Variables** agrega:
   - `NEXT_PUBLIC_SUPABASE_URL` = la Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = la anon / publishable key
3. Pulsa **Deploy**.

### 4. Conectar el dominio de Namecheap

1. En Vercel → tu proyecto → **Settings → Domains** → agrega `scrimmaniacos.com` y `www.scrimmaniacos.com`.
2. Vercel te mostrará los registros DNS exactos. En Namecheap → **Domain List → Manage → Advanced DNS**:
   - borra los registros de "parking" que trae por defecto (`CNAME www → parkingpage…` y el `URL Redirect`);
   - agrega el registro **A** (`@`) y el **CNAME** (`www`) con los valores que indique Vercel.
3. La propagación tarda entre minutos y unas horas. Vercel activa HTTPS automáticamente.

> Si antes configuraste el dominio apuntando a otro hosting (por ejemplo, el hosting de Namecheap o unos *nameservers* personalizados), vuelve a **Nameservers → Namecheap BasicDNS** para que los registros de *Advanced DNS* tengan efecto.

### 5. Hacerte administrador

Entra una vez a la web con tu Gmail. Luego, en Supabase → SQL Editor, ejecuta:

```sql
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'TU-CORREO@gmail.com');
```

Recarga la web y aparecerá el enlace **Admin** en el menú.

---

## Desarrollo local

```bash
cp .env.example .env.local   # completa las dos variables
npm install
npm run dev                  # http://localhost:3000
```

## Estructura

```
supabase/schema.sql      tablas, seguridad, bracket, resultados y ranking
src/app/acciones.ts      acciones del servidor (formularios)
src/app/torneos/[id]     página del torneo: inscripción, bracket, reportes, panel admin
src/app/scrims           búsqueda, aceptación y resultados de scrims
src/components/Bracket   dibujo del cuadro de eliminación
```

## Próximas ideas

- Bot de Discord que avise de partidas, scrims aceptadas y disputas.
- Doble eliminación y fase de grupos / suizo.
- Check-in antes del torneo.
- Subir logos y capturas a Supabase Storage (plan gratis: 1 GB).
