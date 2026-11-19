import { test, expect } from '@playwright/test';

test.describe('Pruebas con Firebase mockeado', () => {
  test('debe admitir una capa de datos simulada con comportamiento realista', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(async () => {
      localStorage.clear();
      const documents = new Map();
      let offline = false;

      const document = (path) => ({
        collection: (name) => collection(`${path}/${name}`),
        async get() {
          if (offline) throw new Error('Firestore no disponible');
          return {
            exists: documents.has(path),
            data: () => structuredClone(documents.get(path)),
          };
        },
        async set(data, options) {
          documents.set(path, structuredClone(options?.merge
            ? { ...documents.get(path), ...data }
            : data));
        },
        async update(data) {
          if (!documents.has(path)) throw new Error('Documento inexistente');
          documents.set(path, { ...documents.get(path), ...structuredClone(data) });
        },
        async delete() {
          documents.delete(path);
        },
      });

      const collection = (path, order) => ({
        doc: (id) => document(`${path}/${id}`),
        orderBy: (field, direction) => collection(path, { field, direction }),
        async get() {
          if (offline) throw new Error('Firestore no disponible');
          const prefix = `${path}/`;
          const entries = [...documents.entries()]
            .filter(([key]) => key.startsWith(prefix) && !key.slice(prefix.length).includes('/'));
          if (order) {
            entries.sort((a, b) => {
              const comparison = String(a[1][order.field]).localeCompare(String(b[1][order.field]));
              return order.direction === 'desc' ? -comparison : comparison;
            });
          }
          return {
            forEach: (callback) => entries.forEach(([key, data]) => callback({
              id: key.slice(prefix.length),
              data: () => structuredClone(data),
            })),
          };
        },
      });

      window.FIREBASE_CONFIGURED = true;
      window.auth = { currentUser: { uid: 'usuario-prueba' } };
      window.db = { collection: (name) => collection(name) };
      db = window.db;

      await window.DataService.savePerfil({ nombre: 'Hogar de prueba', correo: 'prueba@ejemplo.com' });
      await window.DataService.saveFactura({ id: 'FAC-001', periodo: '2026-01', valor: 100 });
      await window.DataService.saveFactura({ id: 'FAC-002', periodo: '2026-02', valor: 200 });
      await window.DataService.updateFactura('FAC-001', { valor: 150 });
      await window.DataService.deleteFactura('FAC-002');

      const remotePerfil = documents.get('users/usuario-prueba')?.perfil;
      const remoteFactura = documents.get('users/usuario-prueba/facturas/FAC-001');
      const deletedFactura = documents.has('users/usuario-prueba/facturas/FAC-002');

      localStorage.clear();
      const perfil = await window.DataService.getPerfil();
      const facturas = await window.DataService.getFacturas();
      offline = true;
      const facturasOffline = await window.DataService.getFacturas();

      return { remotePerfil, remoteFactura, deletedFactura, perfil, facturas, facturasOffline };
    });

    expect(result.remotePerfil).toMatchObject({ nombre: 'Hogar de prueba', correo: 'prueba@ejemplo.com' });
    expect(result.remoteFactura).toEqual({ id: 'FAC-001', periodo: '2026-01', valor: 150 });
    expect(result.deletedFactura).toBe(false);
    expect(result.perfil).toMatchObject({ nombre: 'Hogar de prueba', correo: 'prueba@ejemplo.com' });
    expect(result.facturas).toEqual([{ id: 'FAC-001', periodo: '2026-01', valor: 150 }]);
    expect(result.facturasOffline).toEqual(result.facturas);
  });
});
