import { test, expect } from '@playwright/test';

test.describe('Authentication & Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
  });

  test('should login successfully and redirect to dashboard', async ({ page }) => {
    // Ensure we are on the login page
    await expect(page).toHaveURL(/.*login/);
    
    // Fill credentials (assuming admin credentials are used for testing)
    await page.fill('input[type="text"]', 'admin@ims.test');
    await page.fill('input[type="password"]', 'password');
    
    // Click login
    await page.click('button:has-text("Masuk ke Sistem")');
    
    // Wait for navigation and verify dashboard is loaded
    await expect(page).toHaveURL('http://localhost:5173/');
    
    // Verify Dashboard title or element is visible
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible();
    
    // Verify logout
    await page.click('button[aria-label="Toggle Sidebar"]'); // Ensure sidebar is ready
    // You can add more detailed interactions here as needed
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[type="text"]', 'admin@ims.test');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button:has-text("Masuk ke Sistem")');
    
    // Verify error message
    await expect(page.locator('text=Gagal Masuk')).toBeVisible();
  });
});
