---
title: Marko Pollo Demo
author: Marko Pollo
---

# Marko Pollo :rocket:

A beautiful slide deck engine for developers

---

## Features

- Markdown-powered slides
- Syntax highlighting with Shiki
- Mermaid diagrams
- Live editor with split preview
- Keyboard navigation
- Dark cinematic theme

---

## Code Highlighting

```typescript
interface Slide {
  content: string
  metadata: Record<string, string>
}

function parseSlides(markdown: string): Slide[] {
  return markdown
    .split('---')
    .map(chunk => ({
      content: chunk.trim(),
      metadata: {},
    }))
}
```

---

## Diagrams

```mermaid
graph LR
    A[Markdown] --> B[Parser]
    B --> C[Slides]
    C --> D[Renderer]
    D --> E[Beautiful Output]
```

---

## Tables

| Feature | Status |
|---------|--------|
| Slide splitting | Done |
| Code highlighting | Done |
| Mermaid diagrams | Done |
| Live editor | Done |
| Keyboard nav | Done |

---

## Keyboard Shortcuts

- **Arrow keys** - Navigate slides
- **F** - Toggle fullscreen
- **O** - Overview grid
- **E** - Toggle editor
- **1-9** - Jump to slide

---

## Get Started

Press **E** to open the editor and start writing your own slides!

Built with :heart: using React, Vite, and the unified ecosystem.
