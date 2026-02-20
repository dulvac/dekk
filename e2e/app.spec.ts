import { test, expect } from '@playwright/test'

test.describe('Marko Pollo E2E', () => {
  test('loads presentation view and renders first slide', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1, h2')).toBeVisible()
    await expect(page.getByText('/')).toBeVisible() // slide counter "N / M"
  })

  test('navigates between slides with arrow keys', async ({ page }) => {
    await page.goto('/')
    const counter = page.getByText(/\d+ \/ \d+/)
    await expect(counter).toHaveText(/1 \/ \d+/)
    await page.keyboard.press('ArrowRight')
    await expect(counter).toHaveText(/2 \/ \d+/)
    await page.keyboard.press('ArrowLeft')
    await expect(counter).toHaveText(/1 \/ \d+/)
  })

  test('switches to editor view with E key', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('e')
    await expect(page).toHaveURL(/#editor/)
    await expect(page.locator('.cm-editor')).toBeVisible()
  })

  test('switches to overview with O key', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('o')
    await expect(page).toHaveURL(/#overview/)
    await expect(page.getByRole('grid', { name: 'Slide overview' })).toBeVisible()
  })

  test('progress bar has ARIA attributes', async ({ page }) => {
    await page.goto('/')
    const progressbar = page.getByRole('progressbar', { name: 'Slide progress' })
    await expect(progressbar).toBeVisible()
    await expect(progressbar).toHaveAttribute('aria-valuemin', '1')
    await expect(progressbar).toHaveAttribute('aria-valuemax', /\d+/)
  })
})
