import { test, expect } from '@playwright/test'

test('server responds to /api/decks with test fixtures', async ({ request }) => {
  const res = await request.get('/api/decks')
  expect(res.ok()).toBeTruthy()
  const decks = await res.json()
  expect(decks.length).toBeGreaterThanOrEqual(2)
  expect(decks.find((d: { id: string }) => d.id === 'demo-talk')).toBeTruthy()
})

test('server responds to /api/deck/:id with markdown', async ({ request }) => {
  // listDecks must be called first to populate the registry
  await request.get('/api/decks')
  const res = await request.get('/api/deck/demo-talk')
  expect(res.ok()).toBeTruthy()
  const text = await res.text()
  expect(text).toContain('# Slide One')
})

test('SPA loads in CLI mode and shows picker', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page.getByText('Demo Talk')).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('Quick Intro')).toBeVisible({ timeout: 15000 })
})

test('SPA navigates to a deck from picker', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.getByText('Demo Talk').click({ timeout: 15000 })
  await expect(page.getByText('Slide One')).toBeVisible({ timeout: 15000 })
})

test('security headers are present', async ({ request }) => {
  const res = await request.get('/')
  expect(res.headers()['x-content-type-options']).toBe('nosniff')
  expect(res.headers()['x-frame-options']).toBe('DENY')
})
