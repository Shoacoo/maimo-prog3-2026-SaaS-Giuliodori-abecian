# Triphy

## Presentación

Triphy es una aplicación para planificar viajes de punta a punta: desde elegir las ciudades que vas a visitar hasta armar, día por día, qué vas a hacer en cada una, cuánto vas a gastar y qué recuerdos te llevás. Reemplaza la mezcla de notas sueltas, planillas y pestañas de Google Maps que normalmente se usa para organizar un viaje, y centraliza todo en un solo lugar que se puede compartir con los compañeros de viaje.

## Integrantes

- Juan Cruz Giuliodori
- Joaco Abecian *(completar nombre completo)*

## El problema

Planificar un viaje implica juntar información de muchas fuentes distintas: lugares para visitar, horarios, gastos, notas, mapas, fotos. Esa información se pierde fácil o queda dispersa entre apps que no se hablan entre sí, y es difícil de compartir con quienes viajan con vos. Triphy le da a cada viaje un espacio propio, compartido con los compañeros, donde toda esa planificación vive junta y es fácil de reorganizar a medida que el plan cambia.

## Usuario objetivo

Cualquier persona que esté organizando un viaje (de un fin de semana o de varias semanas, a una o varias ciudades, solo o en grupo) y quiera tener el itinerario, los lugares, el presupuesto y los recuerdos en un solo lugar, accesible desde cualquier dispositivo.

## Funcionalidades

**Cuentas y acceso**
- Registro e inicio de sesión con email y contraseña o con Google, verificación de cuenta y recuperación de contraseña.
- Sesión por cookie del lado del servidor (Firebase Admin).

**Viajes**
- Crear un viaje con nombre, fechas, una o varias ciudades (buscadas con Google Places) y compañeros, con vista previa en vivo y mapa a toda la altura.
- **Editar el viaje** (nombre, fechas y paradas) desde la tarjeta en "Mis viajes" o desde la portada del viaje. Si cambian las fechas, las actividades, gastos y recuerdos se reubican sin perderse, y el modal avisa antes de guardar. Una ciudad con fotos en Recuerdos no se puede quitar hasta mover esas fotos.
- Reordenar las paradas arrastrándolas y eliminar un viaje (solo el dueño, con confirmación).
- **Viajes compartidos**: se invita a compañeros por email. Si ya tienen cuenta pueden ver y editar el viaje al instante; si no, quedan invitados hasta registrarse. Las invitaciones se envían por mail (Nodemailer + SMTP).
- Barra de progreso de planificación según las actividades cargadas (una por día más una por parada).

**Itinerario día por día**
- Calendario y vista por días, con la ciudad de cada día.
- Agregar lugares a cualquier día desde el mapa, desde "Lugares para visitar" o desde el buscador del itinerario.
- Reordenar actividades dentro de un día o moverlas a otro arrastrándolas; horario (bloques de 15 minutos) y nota por actividad.

**Lugares y mapa**
- Mapa interactivo en todas las pantallas del viaje, con la ruta entre ciudades y los lugares cercanos por categoría. **Se puede plegar** hacia el costado para darle más espacio al contenido (la elección se recuerda).
- "Lugares para visitar": selección de los lugares mejor puntuados de cada ciudad, filtrable por ciudad y categoría, con recomendaciones destacadas.
- Ficha de cada lugar: fotos, horarios (abierto/cerrado calculado en el momento), reseñas, rango de precios, formas de pago y estación de transporte más cercana.
- **Favoritos**: botón de corazón en todas las vistas de lugares, sincronizado entre pantallas.

**Notas**
- Notas tipo tarjeta, con carpetas y colores; se crean, editan, reordenan arrastrando y eliminan.

**Presupuesto y gastos**
- Presupuesto por viaje en varias monedas y gastos por categoría y por día, ligados opcionalmente a una actividad del itinerario, con estado pagado o pendiente.

**Recuerdos**
- Fotos (comprimidas en el navegador) y bitácora por ciudad y día.
- Souvenirs: dónde comprar regalos en cada ciudad (tiendas de souvenirs, artesanías, mercados), con los lugares en el mapa.

**Mi mundo**
- Globo 3D (Three.js / react-globe.gl) con la Tierra real en modo día y noche (imágenes de la NASA), los países pintados según el estado de tus viajes (explorando, visitado, planificado), las ciudades y las rutas.
- Resumen (países, ciudades, viajes) y listado de viajes por estado: al elegir uno, el globo gira hasta ese país.

**Panel de administración**
- Rol de administrador separado del de usuario común.
- Métricas generales (usuarios, viajes por semana, lugares más buscados y agregados) con gráficos.
- Gestión de usuarios, viajes y lugares.

## Modelo de datos (Cloud Firestore)

### `trips` (entidad principal)

| Campo | Descripción |
|---|---|
| `userId` | Dueño del viaje |
| `memberIds` | Dueño y compañeros con cuenta (pueden ver y editar) |
| `invitedEmails` | Emails invitados que todavía no se registraron |
| `companions` | Compañeros del viaje (email, nombre y uid si tienen cuenta) |
| `name`, `startDate`, `endDate` | Datos generales (fechas en formato `YYYY-MM-DD`) |
| `destinations` | Paradas en orden: id (place id de Google), nombre, país, código de país, lat, lng y foto |
| `itinerary` | Actividades por día (`{ "YYYY-MM-DD": [ ... ] }`), cada una con lugar, horario y nota |
| `favorites` | Lugares favoritos del viaje, con su ciudad |
| `notes`, `noteFolders` | Notas del viaje y sus carpetas |
| `memoryPhotos` | Datos de las fotos de Recuerdos (ciudad, día, lugar); los bytes van en la colección `memoryPhotos` |
| `memoryEntries` | Entradas de la bitácora por ciudad y día |
| `budget`, `expenses` | Presupuesto (monto y moneda) y gastos (monto, categoría, día, actividad, pagado) |
| `createdAt`, `updatedAt` | Fechas de creación y modificación |

### Otras colecciones

| Colección | Uso |
|---|---|
| `users` | Perfil y rol (`user` o `admin`) de cada usuario |
| `memoryPhotos` | Bytes de cada foto de Recuerdos (versión grande de hasta 850 KB y miniatura de hasta 120 KB). Se guardan en Firestore porque el proyecto no usa Cloud Storage |
| `placeEvents` | Búsquedas y lugares agregados, para las métricas del panel de administración |

## Rutas principales

- `/login`: acceso.
- `/dashboard/trips`: mis viajes.
- `/dashboard/trips/new`: crear viaje.
- `/dashboard/mundo`: Mi mundo (globo 3D).
- `/dashboard/trips/[id]`: resumen del viaje.
- `/dashboard/trips/[id]/itinerario`: itinerario y calendario.
- `/dashboard/trips/[id]/lugares`: lugares para visitar.
- `/dashboard/trips/[id]/notas`: notas.
- `/dashboard/trips/[id]/gastos`: presupuesto y gastos.
- `/dashboard/trips/[id]/recuerdos`: fotos y bitácora.
- `/dashboard/trips/[id]/souvenirs`: dónde comprar souvenirs.
- `/admin`: panel de administración (solo administradores).

## Stack

- **Next.js 16** (App Router, Server Components y Server Actions, Turbopack) y **React 19**.
- **Tailwind CSS 4**.
- **Firebase**: Authentication (cliente) y Firebase Admin (sesiones y Cloud Firestore en el servidor).
- **Google Maps Platform**: Maps JavaScript API, Places API (New) y Routes API.
- **Three.js** y **react-globe.gl** para el globo de Mi mundo.
- **@dnd-kit** (arrastrar y soltar), **react-day-picker** (fechas), **Recharts** (gráficos del admin) y **Nodemailer** (emails de invitación).

## APIs externas y caché

- **Places API (New)**: búsqueda de ciudades y lugares, lugares cercanos, fichas, fotos y descripciones.
- **Routes API**: ruta en auto entre las paradas del viaje.
- **Maps JavaScript API**: los mapas.
- Los pedidos a Google se guardan en una **caché del servidor** (`unstable_cache` de Next, en `.next/cache`) para no repetirlos: lugares cercanos 7 días, fichas 12 h ("abierto ahora" se calcula al leer), fotos 1 día, descripciones 30 días, búsquedas 1 día, ciudades y rutas 30 días. Si Google responde con error, no se guarda nada.
- **Imágenes de la Tierra**: NASA Visible Earth, *Blue Marble* (día) y *Black Marble* (noche), de dominio público. Crédito: NASA Earth Observatory.

## Cómo ejecutar el proyecto

1. Instalar dependencias: `yarn install`
2. Copiar `.env.example` a `.env` y completar:
   - `NEXT_PUBLIC_FIREBASE_*`: configuración web de Firebase.
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY`: cuenta de servicio de Firebase Admin.
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: key de Google con **Maps JavaScript API**, **Places API (New)** y **Routes API** habilitadas. La usa también el servidor, así que no puede tener restricción de "sitios web".
   - `SMTP_USER` y `SMTP_PASS` (opcionales `SMTP_HOST` y `SMTP_PORT`): cuenta para enviar las invitaciones por mail. Con Gmail se usa una "contraseña de aplicación".
   - `NEXT_PUBLIC_APP_URL` (opcional): URL pública para los links de los emails.
3. En Firebase Console habilitar Authentication (Email/Password y Google) y Cloud Firestore.
4. Levantar el servidor de desarrollo: `yarn dev`
5. Abrir `http://localhost:3000`

> En desarrollo, la primera vez que se abre cada página tarda unos segundos porque Next la compila en ese momento. En producción (`yarn build` + `yarn start`, o Vercel) las páginas ya vienen compiladas.
