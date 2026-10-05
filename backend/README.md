# API básica de fútbol

Servidor REST sin dependencias externas. Los datos de ejemplo se guardan en memoria y se reinician al detener el servidor.

## Ejecutar

Requiere Node.js 18 o posterior.

```sh
npm start
```

La API queda disponible en `http://localhost:3000`. Se puede cambiar el puerto con la variable de entorno `PORT`. Para desarrollo con reinicio automático: `npm run dev`.

## Rutas

Todas las respuestas usan JSON.

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api/salud` | Estado del servidor |
| GET | `/api/equipos` | Lista equipos |
| GET | `/api/equipos/:id` | Consulta un equipo |
| POST | `/api/equipos` | Crea equipo (`nombre`, `ciudad`) |
| PATCH | `/api/equipos/:id` | Actualiza `nombre` y/o `ciudad` |
| DELETE | `/api/equipos/:id` | Elimina un equipo sin partidos asociados |
| GET | `/api/partidos` | Lista partidos con nombres de equipos |
| GET | `/api/partidos?equipoId=:id` | Filtra partidos por equipo |
| GET | `/api/partidos/:id` | Consulta un partido |
| POST | `/api/partidos` | Programa o registra un partido |
| PATCH | `/api/partidos/:id` | Actualiza un partido |
| DELETE | `/api/partidos/:id` | Elimina un partido |
| GET | `/api/tabla` | Tabla calculada de partidos finalizados |

Un partido incluye `localId`, `visitanteId`, `fecha` (formato de fecha válido) y `estado` (`programado` o `finalizado`). Los partidos programados deben tener `golesLocal` y `golesVisitante` en `null`; los finalizados deben tener goles enteros no negativos. La tabla usa el sistema de tres puntos por victoria y uno por empate.

## Pruebas

```sh
npm test
```
