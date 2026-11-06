import { Client } from 'pg';
import { randomUUID } from 'crypto';
import { GENESIS, EventoGuardado, hashEvento, normalizarDetalle, verificarCadena } from '../src/custodia/cadena';

function cadena(n: number): EventoGuardado[] {
  const eventos: EventoGuardado[] = [];
  let anterior = GENESIS;
  for (let i = 1; i <= n; i++) {
    const c = {
      stickerId: 'S1',
      secuencia: i,
      tipo: i === 1 ? 'FABRICACION' : 'EXTRACCION',
      fecha: new Date(Date.UTC(2026, 0, i)).toISOString(),
      responsableId: 'U1',
      responsableNombre: 'Dra. Prueba',
      detalle: normalizarDetalle({ paso: i, adnUgMl: 0.031 + i / 997 }),
      archivoSha256: i === 3 ? 'ab'.repeat(32) : null,
      hashAnterior: anterior,
    };
    const h = hashEvento(c);
    eventos.push({ ...c, hashEvento: h });
    anterior = h;
  }
  return eventos;
}

describe('Cadena de hashes de la custodia', () => {
  test('una cadena bien formada es íntegra', () => {
    const r = verificarCadena(cadena(6));
    expect(r.integra).toBe(true);
    expect(r.eventos).toBe(6);
  });

  test('cada evento incluye el hash del anterior; el primero parte de 64 ceros', () => {
    const e = cadena(3);
    expect(e[0].hashAnterior).toBe(GENESIS);
    expect(e[1].hashAnterior).toBe(e[0].hashEvento);
    expect(e[2].hashAnterior).toBe(e[1].hashEvento);
  });

  test('detecta un detalle modificado', () => {
    const e = cadena(5);
    (e[2].detalle as Record<string, unknown>).paso = 99;
    const r = verificarCadena(e);
    expect(r.integra).toBe(false);
    expect(r.errores[0]).toMatchObject({ secuencia: 3 });
  });

  test('detecta un responsable o una fecha cambiados', () => {
    const a = cadena(4);
    a[1].responsableNombre = 'Otra persona';
    expect(verificarCadena(a).integra).toBe(false);
    const b = cadena(4);
    b[3].fecha = new Date(Date.UTC(2025, 0, 1)).toISOString();
    expect(verificarCadena(b).integra).toBe(false);
  });

  test('detecta un evento eliminado y uno reemplazado aunque se recalcule su hash', () => {
    const a = cadena(5);
    a.splice(2, 1);
    expect(verificarCadena(a).integra).toBe(false);
    const b = cadena(5);
    const falso = { ...b[2], detalle: { paso: 'falso' } };
    falso.hashEvento = hashEvento({ ...falso, fecha: falso.fecha as string });
    b[2] = falso;
    const r = verificarCadena(b);
    expect(r.integra).toBe(false);
    expect(r.errores.some((x) => x.secuencia === 4)).toBe(true);
  });

  test('los números del detalle sobreviven el viaje por JSON con 12 cifras', () => {
    const d = normalizarDetalle({ x: 0.042240999937057495, y: [1 / 3] }) as { x: number; y: number[] };
    expect(JSON.parse(JSON.stringify(d))).toEqual(d);
    expect(String(d.x).replace(/^0\.0*/, '').length).toBeLessThanOrEqual(12);
  });
});

// Requiere la base de datos de server/.env con las migraciones aplicadas.
describe('Trigger de PostgreSQL: EventoCustodia es de solo inserción', () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL?.replace(/\?schema=.*/, '') });
  beforeAll(() => db.connect());
  afterAll(() => db.end());

  test('rechaza UPDATE, DELETE y TRUNCATE incluso con acceso directo a la base', async () => {
    await db.query('BEGIN');
    try {
      const usuario = randomUUID();
      const plantilla = randomUUID();
      const lote = randomUUID();
      const sticker = randomUUID();
      await db.query(`INSERT INTO "Usuario"(id, nombre, email, rol, "passwordHash") VALUES ($1, 'Prueba', $2, 'ADMIN', 'x')`, [usuario, `prueba-${usuario}@test`]);
      await db.query(`INSERT INTO "PlantillaSticker"(id, nombre, pais, posiciones) VALUES ($1, $2, 'Test', '{1}')`, [plantilla, `p-${plantilla}`]);
      await db.query(`INSERT INTO "Lote"(id, codigo, "plantillaId", cantidad, "fechaFabricacion", "versionDiseno", fabrica, "creadoPorId") VALUES ($1, $2, $3, 1, now(), '1', 'f', $4)`, [lote, `L-${lote}`, plantilla, usuario]);
      await db.query(`INSERT INTO "Sticker"(id, codigo, "loteId", "updatedAt") VALUES ($1, $2, $3, now())`, [sticker, `T-${sticker}`, lote]);
      await db.query(
        `INSERT INTO "EventoCustodia"(id, "stickerId", secuencia, tipo, fecha, "responsableId", "responsableNombre", detalle, "hashAnterior", "hashEvento") VALUES ($1, $2, 1, 'FABRICACION', now(), $3, 'Prueba', '{}', $4, $5)`,
        [randomUUID(), sticker, usuario, GENESIS, randomUUID()],
      );
      for (const sql of [
        `UPDATE "EventoCustodia" SET "responsableNombre" = 'Otro' WHERE "stickerId" = '${sticker}'`,
        `DELETE FROM "EventoCustodia" WHERE "stickerId" = '${sticker}'`,
        `TRUNCATE "EventoCustodia" CASCADE`,
      ]) {
        await db.query('SAVEPOINT intento');
        await expect(db.query(sql)).rejects.toThrow(/solo inserción/);
        await db.query('ROLLBACK TO SAVEPOINT intento');
      }
      const r = await db.query(`SELECT "responsableNombre" FROM "EventoCustodia" WHERE "stickerId" = $1`, [sticker]);
      expect(r.rows).toEqual([{ responsableNombre: 'Prueba' }]);
    } finally {
      await db.query('ROLLBACK');
    }
  });
});
