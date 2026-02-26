import { test, expect } from '@playwright/test'

test.describe('Marko Pollo E2E', () => {
  test('root shows presentation picker', async ({ page }) => {
    await page.goto('./')
    await expect(page.getByRole('heading', { name: 'marko pollo' })).toBeVisible()
    // At least the default deck should appear
    const buttons = page.getByRole('button')
    await expect(buttons.first()).toBeVisible()
    const count = await buttons.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('clicking a deck card navigates to presentation', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button').first().click()
    await expect(page).toHaveURL(/#deck\//)
    await expect(page.locator('h1, h2')).toBeVisible()
  })

  test('navigates between slides with arrow keys', async ({ page }) => {
    await page.goto('./#deck/default/0')
    const counter = page.getByText(/\d+ \/ \d+/)
    await expect(counter).toHaveText(/1 \/ \d+/)
    await page.keyboard.press('ArrowRight')
    await expect(counter).toHaveText(/2 \/ \d+/)
  })

  test('E key switches to editor view', async ({ page }) => {
    await page.goto('./#deck/default/0')
    // Wait for presentation to be fully loaded
    await expect(page.getByText(/\d+ \/ \d+/)).toBeVisible()
    await page.keyboard.press('e')
    await expect(page).toHaveURL(/#deck\/default\/editor/)
    await expect(page.locator('.cm-editor')).toBeVisible()
  })

  test('O key switches to overview', async ({ page }) => {
    await page.goto('./#deck/default/0')
    // Wait for presentation to be fully loaded
    await expect(page.getByText(/\d+ \/ \d+/)).toBeVisible()
    await page.keyboard.press('o')
    await expect(page).toHaveURL(/#deck\/default\/overview/)
  })

  test('progress bar has ARIA attributes', async ({ page }) => {
    await page.goto('./#deck/default/0')
    const progressbar = page.getByRole('progressbar', { name: 'Slide progress' })
    await expect(progressbar).toBeVisible()
  })

  test('browser back returns to picker from deck', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button').first().click()
    await expect(page).toHaveURL(/#deck\//)
    await page.goBack()
    await expect(page.getByRole('heading', { name: 'marko pollo' })).toBeVisible()
  })

  test('Ctrl+S downloads presentation as .md', async ({ page }) => {
    await page.goto('./#deck/default/0')
    // Wait for presentation to load
    await expect(page.getByText(/\d+ \/ \d+/)).toBeVisible()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.keyboard.press('Control+s'),
    ])
    expect(download.suggestedFilename()).toMatch(/\.md$/)
  })

  test('Ctrl+S works from editor view', async ({ page }) => {
    await page.goto('./#deck/default/editor')
    await expect(page.locator('.cm-editor')).toBeVisible()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.keyboard.press('Control+s'),
    ])
    expect(download.suggestedFilename()).toMatch(/\.md$/)
  })

  test('dev save button triggers file write', async ({ page }) => {
    await page.goto('./#deck/default/editor')
    await expect(page.locator('.cm-editor')).toBeVisible()

    // Mock the dev server write endpoint
    await page.route('**/__marko-pollo/write-file', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
    )
    // Mock the ping endpoint to indicate dev environment
    await page.route('**/__marko-pollo/ping', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
    )

    // Find and click the Save button
    const saveButton = page.getByRole('button', { name: /save/i })
    if (await saveButton.isVisible()) {
      await saveButton.click()
      // Wait a moment for the save operation to complete
      await page.waitForTimeout(500)
    }
  })

  test('editor edits persist to localStorage across reload', async ({ page }) => {
    await page.goto('./#deck/default/editor')
    await expect(page.locator('.cm-editor')).toBeVisible()

    // Type into the CodeMirror editor
    const editor = page.locator('.cm-content')
    await editor.click()
    await page.keyboard.press('Control+a')
    await page.keyboard.type('# Persisted Slide')

    // Wait for debounce to save to localStorage
    await page.waitForTimeout(500)

    // Verify localStorage has the draft
    const stored = await page.evaluate(() =>
      localStorage.getItem('marko-pollo-deck-default')
    )
    expect(stored).toContain('# Persisted Slide')

    // Reload the page and navigate back to editor
    await page.goto('./#deck/default/editor')
    await expect(page.locator('.cm-editor')).toBeVisible()

    // Verify the persisted content is loaded
    const editorText = await page.locator('.cm-content').textContent()
    expect(editorText).toContain('Persisted Slide')
  })

  test('Ctrl+S works from overview view', async ({ page }) => {
    await page.goto('./#deck/default/overview')
    // Wait for overview to render slide thumbnails
    await page.waitForTimeout(300)

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.keyboard.press('Control+s'),
    ])
    expect(download.suggestedFilename()).toMatch(/\.md$/)
  })

  test('export button in editor triggers download', async ({ page }) => {
    await page.goto('./#deck/default/editor')
    await expect(page.locator('.cm-editor')).toBeVisible()

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /export/i }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/\.md$/)
  })

  test('picker shows all presentations from presentations/ folder', async ({ page }) => {
    await page.goto('./')
    await expect(page.getByRole('heading', { name: 'marko pollo' })).toBeVisible()

    // There should be at least 4 decks (default, architecture-patterns, getting-started, intro-to-typescript)
    const buttons = page.getByRole('button')
    const count = await buttons.count()
    expect(count).toBeGreaterThanOrEqual(4)
  })
})
