---
description: "Create a new slide deck presentation. Use when asked to make, create, write, or author a presentation, slide deck, talk, or slides."
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

Create a new Dekk slide deck.

## Format Reference

**REQUIRED:** Before writing any slides, read the format specification:

```
presentations/FORMAT.md
```

This file documents every available feature — frontmatter, slide metadata, code annotations, Mermaid diagrams, GFM tables, emoji shortcodes, and more. Use it as your reference throughout.

## Arguments

Parse `$ARGUMENTS` to extract:
- **Topic or title** (optional): What the presentation is about
- **`--name <dir-name>`** (optional): Directory name under `presentations/` (defaults to kebab-case of title)

If no arguments are provided, ask the user what the presentation should cover.

## Steps

1. **Read the format spec:** Read `presentations/FORMAT.md` to load the full slide format reference.

2. **Clarify scope:** If the topic is broad, ask the user:
   - How many slides (rough target)?
   - Audience level (beginner, intermediate, advanced)?
   - Any specific subtopics to include or exclude?
   - Should it include code examples, diagrams, or both?

3. **Plan the outline:** Before writing slides, propose a short outline (slide titles and one-line descriptions). Get user approval before proceeding.

4. **Create the deck directory:**
   ```
   presentations/<dir-name>/slides.md
   ```
   The directory name becomes the deck ID and must be lowercase kebab-case.

5. **Write the slides** following these guidelines:

   **Structure:**
   - Start with YAML frontmatter (`title`, `author`, `date`)
   - Separate slides with `---` on its own line
   - Open with a title slide (`# Title` + subtitle paragraph)
   - Close with a summary or "Thank you" slide

   **Content density:**
   - One idea per slide — avoid walls of text
   - Prefer bullet lists (3–5 items) over paragraphs
   - Use headings (`##`) as slide titles for every slide

   **Visual variety:** Mix content types across slides to keep the deck engaging:
   - Code blocks with syntax highlighting and annotations (`// [!code focus]`, `// [!code ++]`)
   - Mermaid diagrams for architecture, flows, or relationships
   - GFM tables for comparisons or feature matrices
   - Task lists for roadmaps or checklists
   - Blockquotes for key takeaways
   - Emoji shortcodes for visual accents (`:rocket:`, `:sparkles:`)

   **Slide metadata:** Use `<!-- bg: #hex -->` sparingly for emphasis slides (e.g., section dividers or key takeaways). Don't override every slide.

   **Code examples:**
   - Always specify the language for syntax highlighting
   - Use `// [!code focus]` to draw attention to key lines
   - Use `// [!code ++]` / `// [!code --]` for before/after comparisons
   - Keep code blocks short (under 15 lines per slide)

6. **Verify the deck:** After writing, confirm:
   - Frontmatter has `title` and `author`
   - Every slide has a `##` heading (except the title slide which uses `#`)
   - Slide separators (`---`) are on their own line with blank lines around them
   - Code blocks specify a language
   - No slide has more than ~8 bullet points
   - The deck directory name is lowercase kebab-case

7. **Report:** Tell the user the deck path and how to view it (navigate to `/#deck/<dir-name>/1` in the app).

Arguments: $ARGUMENTS
