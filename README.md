# Triphy

## Presentacion

Triphy es una aplicacion para planificar viajes de punta a punta: desde elegir las ciudades que vas a visitar hasta armar, dia por dia, que vas a hacer en cada una. Reemplaza la mezcla de notas sueltas, planillas y pestanas de Google Maps que normalmente se usa para organizar un viaje, centralizando todo en un solo lugar: destinos, itinerario con horarios, lugares recomendados para visitar y apuntes personales.

## Integrantes

- Giuliodori
- Joaco Abecian

*(completar apellidos/nombres completos)*

## El problema

Planificar un viaje implica juntar informacion de muchas fuentes distintas: lugares para visitar, horarios, notas personales, mapas. Esa informacion se pierde facil o queda dispersa entre apps que no se hablan entre si. Triphy le da a cada usuario un espacio propio por viaje donde toda esa planificacion vive junta y es facil de reorganizar a medida que el plan cambia.

## Usuario objetivo

Cualquier persona que este organizando un viaje (de un fin de semana o de varias semanas, a una o varias ciudades) y quiera tener el itinerario, los lugares a visitar y sus notas en un solo lugar, accesible desde cualquier dispositivo.

## Funcionalidades implementadas

**Cuentas y acceso**
- Registro e inicio de sesion con email/contrasena o con Google.
- Cada usuario ve y gestiona unicamente sus propios viajes.

**Gestion de viajes**
- Creacion de un viaje con nombre, fechas y uno o varios destinos (ciudades), buscados y ubicados en el mapa.
- Reordenar los destinos de un viaje arrastrandolos.
- Eliminar un viaje.

**Itinerario dia por dia**
- Por cada dia del viaje, se pueden agregar actividades (lugares) al plan.
- Las actividades se pueden reordenar arrastrandolas dentro de un mismo dia, o moverlas a otro dia distinto arrastrandolas entre columnas.
- Cada actividad se puede editar para fijarle un horario (en bloques de 15 minutos) y agregarle una nota personal (por ejemplo, "reservar con anticipacion").

**Mapa interactivo y lugares para visitar**
- Mapa compartido en las vistas del viaje que muestra el destino y los lugares cercanos por categoria (comida, atracciones, alojamiento, etc.).
- Seccion "Lugares para visitar" con una seleccion curada de los lugares mejor calificados cerca del destino.
- Desde el mapa o desde esa seccion se puede agregar cualquier lugar directo al itinerario de un dia especifico.

**Notas del viaje**
- Notas tipo tarjeta, organizables en carpetas y con colores para clasificarlas.
- Se pueden crear, editar, reordenar (arrastrando) y eliminar.

**Panel de administracion**
- Rol de administrador separado del de usuario comun.
- Dashboard con metricas generales: cantidad de usuarios, viajes creados por semana, lugares mas buscados/agregados, etc., con graficos.
- Gestion de usuarios y de viajes (incluye baja con confirmacion).

## Entidad principal: Viaje (`trips`)

| Campo | Descripcion |
|---|---|
| `userId` | Dueno del viaje |
| `name`, `startDate`, `endDate` | Datos generales del viaje |
| `destinations` | Ciudades elegidas, con su orden |
| `itinerary` | Actividades agendadas, agrupadas por dia, cada una con horario y nota opcional |
| `notes`, `noteFolders` | Notas del viaje y sus carpetas |

## Rutas principales

- `/login` - acceso.
- `/dashboard/trips` - listado de viajes del usuario.
- `/dashboard/trips/new` - crear viaje.
- `/dashboard/trips/[id]` - resumen del viaje.
- `/dashboard/trips/[id]/itinerario` - itinerario dia por dia.
- `/dashboard/trips/[id]/lugares` - lugares recomendados para visitar.
- `/dashboard/trips/[id]/notas` - notas del viaje.
- `/admin` - panel de administracion (solo administradores).

## Como ejecutar el proyecto

1. Instalar dependencias: `npm install`
2. Copiar `.env.example` a `.env` y completar las credenciales de Firebase y de Google Maps/Places.
3. En Firebase Console habilitar Authentication (Email/Password y Google) y Cloud Firestore.
4. Levantar el servidor: `npm run dev`
5. Abrir `http://localhost:3000`
