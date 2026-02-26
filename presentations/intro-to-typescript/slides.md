---
title: Intro to TypeScript
author: Jane Developer
---

# Intro to TypeScript

A practical guide to getting started with **TypeScript**

---

## Why TypeScript?

- **Type safety** catches bugs at compile time, not runtime
- *Excellent* editor support with IntelliSense
- Gradual adoption — works alongside existing JavaScript
- Growing ecosystem and community

---

## Basic Types

```typescript
// Primitives
const name: string = 'Alice'
const age: number = 30
const active: boolean = true

// Arrays
const scores: number[] = [95, 87, 92]

// Object types
interface User {
  id: number
  name: string
  email?: string  // optional property
}
```

---

## Functions & Generics

```typescript
// Typed function parameters and return values
function greet(user: User): string {
  return `Hello, ${user.name}!`
}

// Generics let you write reusable, type-safe code
function first<T>(items: T[]): T | undefined {
  return items[0]
}

const num = first([1, 2, 3])    // type: number | undefined
const str = first(['a', 'b'])   // type: string | undefined
```

---

## Union Types & Narrowing

```typescript
type Result =
  | { status: 'success'; data: string }
  | { status: 'error'; message: string }

function handleResult(result: Result) {
  if (result.status === 'success') {
    // TypeScript knows result.data exists here
    console.log(result.data)
  } else {
    // TypeScript knows result.message exists here
    console.error(result.message)
  }
}
```

---

## Getting Started

1. Install TypeScript: `npm install -D typescript`
2. Create a config: `npx tsc --init`
3. Start with **strict mode** enabled
4. Rename `.js` files to `.ts` gradually

> TypeScript is JavaScript that scales.
