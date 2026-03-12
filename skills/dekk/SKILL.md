---
name: dekk
description: Generate Dekk-format slide presentations. Use when the user asks to "create a presentation", "generate slides", "make a deck", "build a talk", or invokes /dekk. Supports topic-driven and codebase-aware generation.
version: 0.1.0
---

# Dekk Presentation Generator

Generate conference-ready slide decks in Dekk's markdown format from any project.

## Entry Modes

**With argument** (`/dekk "Introduction to GraphQL"`):
- Topic is provided — skip codebase analysis
- Proceed to kickoff question

**Without argument** (`/dekk`):
- Analyze the current project: read README, scan docs/, look at source structure
- Infer what the presentation could be about
- Proceed to kickoff question

## Question Flow

**Always start with the kickoff question:**

> I'll generate a Dekk presentation. A few quick questions to tailor it — or I can just run with what I've got.
>
> **A)** Just go — use the context and generate immediately
> **B)** Let me answer a few questions first

**If A (just go):** Generate immediately with sensible defaults:
- 10-12 slides
- General developer audience
- Standard talk length (~20 min)

**If B (questions):** Ask these one at a time:
1. Who's the audience? (beginners, senior devs, mixed conference)
2. How long is the talk? (lightning 5min / standard 20min / deep-dive 40min)
3. Any specific points to emphasize or avoid?

Then generate.

## File Placement

1. **Detect existing presentations folder** — use the Glob tool to search for `*/slides.md` at the project root. Check if matched files have Dekk frontmatter (a `---` block at the top containing `title:`). Any directory name counts (`presentations/`, `decks/`, `talks/`, etc.).
2. **If multiple directories found:** Use the one containing the most `slides.md` files.
3. **If one found:** Place the new deck as a subfolder there.
4. **If none found:** Create `presentations/<deck-slug>/slides.md`.
5. **Deck slug:** Derive from the title — lowercase, replace spaces with hyphens, strip non-alphanumeric characters except hyphens (e.g., "Introduction to GraphQL" becomes `intro-to-graphql`). Use common abbreviations where natural (e.g., "Introduction" to "intro").
6. **Slug collision:** If the directory already exists, append `-2` (or `-3`, etc.).

After writing the file, output:

> Presentation created at `<path>/slides.md` (N slides).
> Preview with: `npx dekk ./<parent-dir>` or install the CLI: `brew install dulvac/tap/dekk`

## Dekk Slide Format Reference

### Deck Frontmatter

YAML-like block at the very top of the file, delimited by `---`. The first `---` block is always the deck frontmatter. All subsequent `---` lines are slide separators.

**Important:** Values must NOT be quoted. The parser does simple `key: value` splitting and does not strip quotes. Quoted values will render with literal quote characters.

```
---
title: My Talk Title
author: Speaker Name
date: 2026-03-12
---
```

Supported deck-level keys: `title`, `author`, `date`, `aspectRatio`, plus arbitrary custom keys.

### Slide Separation

Slides are separated by markdown thematic breaks — a line containing only 3 or more of `-`, `*`, or `_` (with optional spaces between). The standard separator is `---` on its own line.

The first slide's content begins immediately after the closing `---` of the frontmatter block.

### Per-Slide Metadata

HTML comment directives placed at the very top of a slide, before any content:

```markdown
<!-- bg: #1a1a2e -->
<!-- class: centered -->
<!-- layout: center -->
<!-- transition: fade -->
```

Supported keys: `bg` (background color), `class` (CSS class), `layout` (slide layout), `transition` (slide transition). Arbitrary keys are accepted by the parser but may not produce visible effects.

### Supported Markdown Features

- **Headers:** `#` through `######`
- **Emphasis:** `**bold**`, `*italic*`, `~~strikethrough~~`
- **Lists:** Ordered, unordered, task lists (`- [ ]`, `- [x]`)
- **Code blocks:** Fenced with language tag. Rendered with Shiki syntax highlighting. Supported languages include typescript, javascript, python, rust, go, bash, json, yaml, html, css, and many more.
- **Mermaid diagrams:** Fenced code block with `mermaid` language tag. Rendered client-side.
- **Tables:** GFM pipe tables with header row.
- **Emoji:** Shortcodes like `:rocket:`, `:heart:`, `:tada:` via remark-emoji.
- **Blockquotes:** `>` prefix.
- **Links and images:** Standard markdown syntax.

## Generation Guidelines

Follow these rules when generating slides:

- **Title slide:** The first slide must have the presentation title as a `#` heading. Include a subtitle or tagline below it.
- **Visual variety:** Mix content types across slides. Do NOT make every slide a bullet list. Alternate between code blocks, mermaid diagrams, tables, blockquotes, and lists.
- **Slide density:** One key idea per slide. Maximum 3-5 bullet points per list slide. Avoid walls of text.
- **Code examples:** Keep code blocks short and focused — 10-20 lines maximum. Always include the language tag for syntax highlighting.
- **Mermaid diagrams:** Use `graph`, `sequenceDiagram`, `flowchart`, or `classDiagram` for architecture, flows, and relationships where a visual aids understanding.
- **Closing slide:** End with a summary slide, call-to-action, or Q&A placeholder.
- **Dark theme awareness:** Dekk renders on a dark cinematic background (#322D2B) with gold (#E4C56C) and green (#1C6331) accents. Text is light (#F0E8D8). Never reference light backgrounds or instruct users to "use a white background." Avoid suggesting colors that would clash with the dark palette.
- **No quoted frontmatter values:** Always write `title: My Title`, never `title: "My Title"`.

### Slide Count by Talk Length

| Talk Length | Slide Count |
|---|---|
| Lightning (5 min) | 5-8 slides |
| Standard (20 min) | 10-15 slides |
| Deep-dive (40 min) | 20-30 slides |
