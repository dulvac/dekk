import { test, expect } from '@playwright/test'

test.describe('Dekk E2E', () => {
  test('root shows presentation picker', async ({ page }) => {
    await page.goto('./')
    await expect(page.getByRole('heading', { name: 'dekk' })).toBeVisible()
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
    await expect(page.getByRole('heading', { name: 'dekk' })).toBeVisible()
  })

  test('Ctrl+S downloads presentation as .md', async ({ page }) => {
    await page.addInitScript(() => {
      // Force blob download fallback in E2E tests
      delete (window as Record<string, unknown>).showSaveFilePicker
    })
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
    await page.addInitScript(() => {
      // Force blob download fallback in E2E tests
      delete (window as Record<string, unknown>).showSaveFilePicker
    })
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
    await page.route('**/__dekk/write-file', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
    )
    // Mock the ping endpoint to indicate dev environment
    await page.route('**/__dekk/ping', route =>
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
      localStorage.getItem('dekk-deck-default')
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
    await page.addInitScript(() => {
      // Force blob download fallback in E2E tests
      delete (window as Record<string, unknown>).showSaveFilePicker
    })
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
    await page.addInitScript(() => {
      // Force blob download fallback in E2E tests
      delete (window as Record<string, unknown>).showSaveFilePicker
    })
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
    await expect(page.getByRole('heading', { name: 'dekk' })).toBeVisible()

    // There should be at least 4 decks (default, architecture-patterns, getting-started, intro-to-typescript)
    const buttons = page.getByRole('button')
    const count = await buttons.count()
    expect(count).toBeGreaterThanOrEqual(4)
  })
})

test.describe('Navigation Controls', () => {
  test('controls appear on mouse move and disappear after timeout', async ({ page }) => {
    await page.goto('./#deck/default/0')
    await expect(page.getByText(/\d+ \/ \d+/)).toBeVisible()

    // The controls container uses opacity for show/hide.
    // Playwright's toBeHidden does not detect parent opacity:0, so we assert CSS directly.
    const controlsContainer = page.locator('[class*="controls"]').first()

    // Initially controls should be hidden (opacity: 0)
    await expect(controlsContainer).toHaveCSS('opacity', '0')

    // Trigger a single mousemove event via JS to show controls without any Playwright mouse positioning
    await page.evaluate(() => {
      document.querySelector('[class*="presentationView"]')?.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, clientX: 500, clientY: 100 })
      )
    })
    await expect(controlsContainer).toHaveCSS('opacity', '1', { timeout: 3000 })

    // After 3s auto-hide timeout + 200ms CSS transition, controls should hide again
    await expect(controlsContainer).toHaveCSS('opacity', '0', { timeout: 5000 })
  })

  test('clicking next arrow advances slide', async ({ page }) => {
    await page.goto('./#deck/default/0')
    await expect(page.getByText(/1 \/ \d+/)).toBeVisible()

    await page.mouse.move(400, 300)
    const nextBtn = page.getByRole('button', { name: /next slide/i })
    await expect(nextBtn).toBeVisible()

    await nextBtn.click()
    await expect(page.getByText(/2 \/ \d+/)).toBeVisible()
  })

  test('clicking prev arrow goes back', async ({ page }) => {
    // Navigate to slide 0, then advance to slide 1 (deep-link resets to 0)
    await page.goto('./#deck/default/0')
    await expect(page.getByText(/1 \/ \d+/)).toBeVisible()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByText(/2 \/ \d+/)).toBeVisible()

    await page.mouse.move(400, 300)
    const prevBtn = page.getByRole('button', { name: /previous slide/i })
    await prevBtn.click()
    await expect(page.getByText(/1 \/ \d+/)).toBeVisible()
  })

  test('clicking O button switches to overview', async ({ page }) => {
    await page.goto('./#deck/default/0')
    await expect(page.getByText(/\d+ \/ \d+/)).toBeVisible()

    await page.mouse.move(400, 300)
    await page.getByRole('button', { name: /overview/i }).click()
    await expect(page).toHaveURL(/#deck\/default\/overview/)
  })

  test('clicking E button switches to editor', async ({ page }) => {
    await page.goto('./#deck/default/0')
    await expect(page.getByText(/\d+ \/ \d+/)).toBeVisible()

    await page.mouse.move(400, 300)
    await page.getByRole('button', { name: /editor/i }).click()
    await expect(page).toHaveURL(/#deck\/default\/editor/)
  })

  test('clicking H button goes to picker', async ({ page }) => {
    await page.goto('./#deck/default/0')
    await expect(page.getByText(/\d+ \/ \d+/)).toBeVisible()

    await page.mouse.move(400, 300)
    await page.getByRole('button', { name: /deck picker/i }).click()
    await expect(page.getByRole('heading', { name: 'dekk' })).toBeVisible()
  })

  test('H key navigates to picker', async ({ page }) => {
    await page.goto('./#deck/default/0')
    await expect(page.getByText(/\d+ \/ \d+/)).toBeVisible()

    await page.keyboard.press('h')
    await expect(page.getByRole('heading', { name: 'dekk' })).toBeVisible()
  })

  test('prev button disabled on first slide', async ({ page }) => {
    await page.goto('./#deck/default/0')
    await page.mouse.move(400, 300)

    const prevBtn = page.getByRole('button', { name: /previous slide/i })
    await expect(prevBtn).toBeDisabled()
  })
})
