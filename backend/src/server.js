import { createServer as createHttpServer } from 'node:http';
import { pathToFileURL } from 'node:url';

const initialTeams = [
  { id: 1, nombre: 'Halcones FC', ciudad: 'Ciudad de México' },
  { id: 2, nombre: 'Leones del Norte', ciudad: 'Monterrey' },
  { id: 3, nombre: 'Tiburones', ciudad: 'Veracruz' },
  { id: 4, nombre: 'Pumas del Sur', ciudad: 'Puebla' },
];

const initialMatches = [
  { id: 1, localId: 1, visitanteId: 2, fecha: '2026-10-10', golesLocal: 2, golesVisitante: 1, estado: 'finalizado' },
  { id: 2, localId: 3, visitanteId: 4, fecha: '2026-10-11', golesLocal: 0, golesVisitante: 0, estado: 'finalizado' },
  { id: 3, localId: 1, visitanteId: 3, fecha: '2026-10-17', golesLocal: null, golesVisitante: null, estado: 'programado' },
];

const sendJson = (response, status, data) => {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  response.end(JSON.stringify(data));
};

const readJson = async (request) => {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) {
      const error = new Error('El cuerpo de la solicitud es demasiado grande.');
      error.status = 413;
      throw error;
    }
  }

  try {
    return JSON.parse(body);
  } catch {
    const error = new Error('El cuerpo debe ser un JSON válido.');
    error.status = 400;
    throw error;
  }
};

const validTeam = (team) =>
  team &&
  typeof team.nombre === 'string' &&
  team.nombre.trim().length > 0 &&
  typeof team.ciudad === 'string' &&
  team.ciudad.trim().length > 0;

const validMatch = (match, teams) => {
  const idsAreValid =
    Number.isInteger(match.localId) &&
    Number.isInteger(match.visitanteId) &&
    match.localId !== match.visitanteId &&
    teams.some(({ id }) => id === match.localId) &&
    teams.some(({ id }) => id === match.visitanteId);
  const validDate = typeof match.fecha === 'string' && !Number.isNaN(Date.parse(match.fecha));
  const validStatus = ['programado', 'finalizado'].includes(match.estado);
  const scoresAreValid =
    match.estado === 'programado'
      ? match.golesLocal == null && match.golesVisitante == null
      : Number.isInteger(match.golesLocal) &&
        match.golesLocal >= 0 &&
        Number.isInteger(match.golesVisitante) &&
        match.golesVisitante >= 0;

  return idsAreValid && validDate && validStatus && scoresAreValid;
};

const buildTable = (teams, matches) => {
  const table = teams.map((team) => ({
    equipo: team.nombre,
    equipoId: team.id,
    partidosJugados: 0,
    ganados: 0,
    empatados: 0,
    perdidos: 0,
    golesFavor: 0,
    golesContra: 0,
    puntos: 0,
  }));
  const rows = new Map(table.map((row) => [row.equipoId, row]));

  for (const match of matches) {
    if (match.estado !== 'finalizado') continue;

    const home = rows.get(match.localId);
    const away = rows.get(match.visitanteId);
    home.partidosJugados += 1;
    away.partidosJugados += 1;
    home.golesFavor += match.golesLocal;
    home.golesContra += match.golesVisitante;
    away.golesFavor += match.golesVisitante;
    away.golesContra += match.golesLocal;

    if (match.golesLocal > match.golesVisitante) {
      home.ganados += 1;
      away.perdidos += 1;
      home.puntos += 3;
    } else if (match.golesLocal < match.golesVisitante) {
      away.ganados += 1;
      home.perdidos += 1;
      away.puntos += 3;
    } else {
      home.empatados += 1;
      away.empatados += 1;
      home.puntos += 1;
      away.puntos += 1;
    }
  }

  return table.sort(
    (a, b) =>
      b.puntos - a.puntos ||
      b.golesFavor - b.golesContra - (a.golesFavor - a.golesContra) ||
      b.golesFavor - a.golesFavor ||
      a.equipo.localeCompare(b.equipo),
  );
};

export function createServer() {
  const teams = structuredClone(initialTeams);
  const matches = structuredClone(initialMatches);
  let nextTeamId = Math.max(...teams.map(({ id }) => id)) + 1;
  let nextMatchId = Math.max(...matches.map(({ id }) => id)) + 1;

  return createHttpServer(async (request, response) => {
    if (request.method === 'OPTIONS') {
      sendJson(response, 204, {});
      return;
    }

    const url = new URL(request.url, 'http://localhost');
    const segments = url.pathname.split('/').filter(Boolean);
    const [api, resource, rawId] = segments;
    const id = rawId === undefined ? undefined : Number(rawId);

    if (api !== 'api') {
      sendJson(response, 404, { error: 'Ruta no encontrada.' });
      return;
    }

    if (resource === 'salud' && request.method === 'GET' && rawId === undefined) {
      sendJson(response, 200, { estado: 'ok' });
      return;
    }

    if (segments.length > 3 || (rawId !== undefined && (!Number.isInteger(id) || id < 1))) {
      sendJson(response, 404, { error: 'Ruta no encontrada.' });
      return;
    }

    try {
      if (resource === 'equipos') {
        if (request.method === 'GET' && rawId === undefined) {
          sendJson(response, 200, teams);
          return;
        }
        if (request.method === 'GET' && rawId !== undefined) {
          const team = teams.find((item) => item.id === id);
          sendJson(response, team ? 200 : 404, team ?? { error: 'Equipo no encontrado.' });
          return;
        }
        if (request.method === 'POST' && rawId === undefined) {
          const body = await readJson(request);
          if (!validTeam(body)) {
            sendJson(response, 400, { error: 'nombre y ciudad son obligatorios.' });
            return;
          }
          const team = { id: nextTeamId++, nombre: body.nombre.trim(), ciudad: body.ciudad.trim() };
          teams.push(team);
          sendJson(response, 201, team);
          return;
        }
        if (request.method === 'PATCH' && rawId !== undefined) {
          const team = teams.find((item) => item.id === id);
          if (!team) {
            sendJson(response, 404, { error: 'Equipo no encontrado.' });
            return;
          }
          const body = await readJson(request);
          const updated = { ...team, ...body };
          if (!validTeam(updated) || Object.keys(body).some((key) => !['nombre', 'ciudad'].includes(key))) {
            sendJson(response, 400, { error: 'El equipo debe tener nombre y ciudad válidos.' });
            return;
          }
          team.nombre = updated.nombre.trim();
          team.ciudad = updated.ciudad.trim();
          sendJson(response, 200, team);
          return;
        }
        if (request.method === 'DELETE' && rawId !== undefined) {
          const index = teams.findIndex((item) => item.id === id);
          if (index === -1) {
            sendJson(response, 404, { error: 'Equipo no encontrado.' });
            return;
          }
          if (matches.some((match) => match.localId === id || match.visitanteId === id)) {
            sendJson(response, 409, { error: 'No se puede eliminar un equipo que tiene partidos registrados.' });
            return;
          }
          teams.splice(index, 1);
          sendJson(response, 200, { mensaje: 'Equipo eliminado.' });
          return;
        }
      }

      if (resource === 'partidos') {
        if (request.method === 'GET' && rawId === undefined) {
          const result = [...matches]
            .filter((match) => !url.searchParams.has('equipoId') ||
              match.localId === Number(url.searchParams.get('equipoId')) ||
              match.visitanteId === Number(url.searchParams.get('equipoId')))
            .map((match) => ({
              ...match,
              local: teams.find(({ id: teamId }) => teamId === match.localId)?.nombre,
              visitante: teams.find(({ id: teamId }) => teamId === match.visitanteId)?.nombre,
            }));
          sendJson(response, 200, result);
          return;
        }
        if (request.method === 'GET' && rawId !== undefined) {
          const match = matches.find((item) => item.id === id);
          sendJson(response, match ? 200 : 404, match ?? { error: 'Partido no encontrado.' });
          return;
        }
        if (request.method === 'POST' && rawId === undefined) {
          const body = await readJson(request);
          if (!validMatch(body, teams)) {
            sendJson(response, 400, {
              error: 'Partido inválido: revisa equipos distintos, fecha, estado y marcador.',
            });
            return;
          }
          const match = { id: nextMatchId++, ...body };
          matches.push(match);
          sendJson(response, 201, match);
          return;
        }
        if (request.method === 'PATCH' && rawId !== undefined) {
          const match = matches.find((item) => item.id === id);
          if (!match) {
            sendJson(response, 404, { error: 'Partido no encontrado.' });
            return;
          }
          const body = await readJson(request);
          const updated = { ...match, ...body };
          if (
            Object.keys(body).some((key) => !['localId', 'visitanteId', 'fecha', 'golesLocal', 'golesVisitante', 'estado'].includes(key)) ||
            !validMatch(updated, teams)
          ) {
            sendJson(response, 400, { error: 'Partido inválido: revisa equipos distintos, fecha, estado y marcador.' });
            return;
          }
          Object.assign(match, updated);
          sendJson(response, 200, match);
          return;
        }
        if (request.method === 'DELETE' && rawId !== undefined) {
          const index = matches.findIndex((item) => item.id === id);
          if (index === -1) {
            sendJson(response, 404, { error: 'Partido no encontrado.' });
            return;
          }
          matches.splice(index, 1);
          sendJson(response, 200, { mensaje: 'Partido eliminado.' });
          return;
        }
      }

      if (resource === 'tabla' && request.method === 'GET' && rawId === undefined) {
        sendJson(response, 200, buildTable(teams, matches));
        return;
      }

      sendJson(response, 404, { error: 'Ruta no encontrada.' });
    } catch (error) {
      sendJson(response, error.status ?? 500, {
        error: error.status ? error.message : 'Error interno del servidor.',
      });
      if (!error.status) console.error(error);
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('PORT debe ser un número entre 1 y 65535.');
    process.exitCode = 1;
  } else {
    createServer().listen(port, () => {
      console.log(`API de fútbol disponible en http://localhost:${port}`);
    });
  }
}
