import { test } from '@playwright/test';

test.describe.skip('Pruebas con Firebase mockeado', () => {
  test('debe admitir una capa de datos simulada con comportamiento realista', () => {
    // Deshabilitada temporalmente: la prueba de mock no refleja un flujo estable en CI.
  });
});
