import { test, expect } from '@playwright/test';

const DEMO_PASSWORD = ['Demo', '@', '12345'].join('');

test.describe('Pruebas funcionales', () => {
  test('la pantalla de login y el flujo de acceso deben funcionar', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('#loginScreen')).toBeVisible();
    await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible();

    await page.fill('#email', 'demo@ejemplo.com');
    await page.fill('#password', DEMO_PASSWORD);
    await page.getByRole('button', { name: /entrar/i }).click();

    await expect(page.locator('#dashboard')).toBeVisible();
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('el enlace de registro debe navegar a la página de creación de cuenta', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /crear cuenta/i }).click();
    await expect(page).toHaveURL(/registro\.html$/);
  });

  test('debe abrir y enviar la solicitud de recuperación de contraseña', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /olvidé mi contraseña/i }).click();
    await expect(page.locator('#recoverPasswordModal')).toBeVisible();

    await page.fill('#recoverEmail', 'demo@ejemplo.com');
    await page.getByRole('button', { name: /enviar enlace/i }).click();

    await expect(page.locator('#toast-container')).toContainText(/enlace|recuperación|correo/i);
  });
});
