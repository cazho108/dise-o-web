import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from '../src/server.js';

const server = createServer();
let baseUrl;

before(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('responde estado de salud y equipos iniciales', async () => {
  const health = await fetch(`${baseUrl}/api/salud`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { estado: 'ok' });

  const teams = await fetch(`${baseUrl}/api/equipos`);
  assert.equal(teams.status, 200);
  assert.equal((await teams.json()).length, 4);
});

test('crea equipos y rechaza datos inválidos', async () => {
  const created = await fetch(`${baseUrl}/api/equipos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: 'Atlas', ciudad: 'Guadalajara' }),
  });
  assert.equal(created.status, 201);
  assert.deepEqual(await created.json(), { id: 5, nombre: 'Atlas', ciudad: 'Guadalajara' });

  const invalid = await fetch(`${baseUrl}/api/equipos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: '', ciudad: 'Guadalajara' }),
  });
  assert.equal(invalid.status, 400);
});

test('calcula la tabla solo con partidos finalizados', async () => {
  const response = await fetch(`${baseUrl}/api/tabla`);
  const table = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(
    table.slice(0, 2).map(({ equipo, puntos }) => [equipo, puntos]),
    [['Halcones FC', 3], ['Pumas del Sur', 1]],
  );
});

test('valida partidos y permite filtrar por equipo', async () => {
  const invalid = await fetch(`${baseUrl}/api/partidos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      localId: 1,
      visitanteId: 1,
      fecha: '2026-10-20',
      golesLocal: null,
      golesVisitante: null,
      estado: 'programado',
    }),
  });
  assert.equal(invalid.status, 400);

  const response = await fetch(`${baseUrl}/api/partidos?equipoId=1`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).length, 2);
});
