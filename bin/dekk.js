#!/usr/bin/env node

// cli/index.ts
import { readFile as readFile3 } from "node:fs/promises";
import { stat as stat2 } from "node:fs/promises";
import path2 from "node:path";
import { fileURLToPath } from "node:url";
import { execFile, exec } from "node:child_process";
import { promisify } from "node:util";

// cli/sources/local.ts
import { readdir, stat, readFile, writeFile } from "node:fs/promises";
import { join, resolve, relative } from "node:path";
var VALID_ID = /^[a-zA-Z0-9_-]+$/;
var THEMATIC_BREAK_LINE = /^\s*(?:(-\s*){3,}|(\*\s*){3,}|(_\s*){3,})\s*$/;
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
function extractFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return {};
  const result = {};
  const lines = match[1].split("\n");
  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      if (key === "title") result.title = value;
      if (key === "author") result.author = value;
    }
  }
  return result;
}
function countSlides(markdown) {
  let body = markdown;
  const fmMatch = markdown.match(/^---\n[\s\S]*?\n---\n/);
  if (fmMatch) {
    body = markdown.slice(fmMatch[0].length);
  }
  if (!body.trim()) return 0;
  const lines = body.split("\n");
  let slideCount = 1;
  for (const line of lines) {
    if (THEMATIC_BREAK_LINE.test(line)) {
      slideCount++;
    }
  }
  return slideCount;
}
function validateId(id) {
  if (!VALID_ID.test(id)) {
    throw new Error(`Invalid deck ID: "${id}". Must match [a-zA-Z0-9_-]+`);
  }
}
var LocalSource = class {
  writable = true;
  sourceType = "local";
  baseDir;
  registry = /* @__PURE__ */ new Map();
  constructor(baseDir) {
    this.baseDir = resolve(baseDir);
  }
  async listDecks() {
    this.registry.clear();
    const entries = await readdir(this.baseDir, { withFileTypes: true });
    const decks = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const slidesPath = join(this.baseDir, entry.name, "slides.md");
        try {
          const s = await stat(slidesPath);
          if (s.isFile()) {
            const id = slugify(entry.name);
            if (!id) continue;
            const content = await readFile(slidesPath, "utf-8");
            const { title, author } = extractFrontmatter(content);
            const slideCount = countSlides(content);
            this.registry.set(id, { id, absolutePath: slidesPath });
            decks.push({
              id,
              title: title ?? id,
              author,
              slideCount
            });
          }
        } catch {
        }
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        const filePath = join(this.baseDir, entry.name);
        const baseName = entry.name.replace(/\.md$/, "");
        const id = slugify(baseName);
        if (!id) continue;
        const content = await readFile(filePath, "utf-8");
        const { title, author } = extractFrontmatter(content);
        const slideCount = countSlides(content);
        this.registry.set(id, { id, absolutePath: filePath });
        decks.push({
          id,
          title: title ?? id,
          author,
          slideCount
        });
      }
    }
    return decks;
  }
  async readDeck(id) {
    validateId(id);
    const entry = this.registry.get(id);
    if (!entry) {
      throw new Error(`Unknown deck: "${id}"`);
    }
    return readFile(entry.absolutePath, "utf-8");
  }
  async writeDeck(id, content) {
    validateId(id);
    const entry = this.registry.get(id);
    if (!entry) {
      throw new Error(`Unknown deck: "${id}"`);
    }
    const rel = relative(this.baseDir, entry.absolutePath);
    if (rel.startsWith("..") || resolve(entry.absolutePath) !== entry.absolutePath) {
      throw new Error("Path traversal detected");
    }
    await writeFile(entry.absolutePath, content, "utf-8");
    return {};
  }
  async dispose() {
  }
};

// cli/sources/github.ts
var VALID_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
var THEMATIC_BREAK_LINE2 = /^\s*(?:(-\s*){3,}|(\*\s*){3,}|(_\s*){3,})\s*$/;
var GitHubSource = class {
  writable = true;
  sourceType = "github";
  apiBase;
  owner;
  repo;
  basePath;
  ref;
  token;
  cache = /* @__PURE__ */ new Map();
  registry = /* @__PURE__ */ new Map();
  constructor(options) {
    this.owner = options.owner;
    this.repo = options.repo;
    this.basePath = options.path.replace(/^\/+|\/+$/g, "");
    this.ref = options.ref;
    this.token = options.token;
    this.apiBase = options.host === "github.com" ? "https://api.github.com" : `https://${options.host}/api/v3`;
  }
  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  async listDecks() {
    this.registry.clear();
    this.cache.clear();
    const refParam = this.ref ? `?ref=${encodeURIComponent(this.ref)}` : "";
    const contentsPath = `/repos/${enc(this.owner)}/${enc(this.repo)}/contents/${this.basePath}${refParam}`;
    const res = await this.apiFetch(contentsPath);
    this.assertOk(res, "Failed to list decks");
    const items = await res.json();
    const entries = [];
    for (const item of items) {
      if (item.type === "dir") {
        try {
          const content = await this.fetchFileContent(
            `${this.basePath}/${item.name}/slides.md`
          );
          const { title, author } = extractFrontmatter2(content);
          const slideCount = countSlides2(content);
          this.registry.set(item.name, {
            path: `${this.basePath}/${item.name}/slides.md`
          });
          this.cache.set(item.name, content);
          entries.push({
            id: item.name,
            title: title ?? item.name,
            author,
            slideCount
          });
        } catch {
        }
      } else if (item.type === "file" && item.name.endsWith(".md") && item.name !== "README.md") {
        const id = item.name.replace(/\.md$/, "");
        try {
          const content = await this.fetchFileContent(
            `${this.basePath}/${item.name}`
          );
          const { title, author } = extractFrontmatter2(content);
          const slideCount = countSlides2(content);
          this.registry.set(id, {
            path: `${this.basePath}/${item.name}`
          });
          this.cache.set(id, content);
          entries.push({
            id,
            title: title ?? id,
            author,
            slideCount
          });
        } catch {
        }
      }
    }
    return entries.sort((a, b) => a.id.localeCompare(b.id));
  }
  async readDeck(id) {
    validateId2(id);
    const cached = this.cache.get(id);
    if (cached !== void 0) return cached;
    const entry = this.registry.get(id);
    if (!entry) throw new Error(`Deck not found: ${id}`);
    const content = await this.fetchFileContent(entry.path);
    this.cache.set(id, content);
    return content;
  }
  async writeDeck(id, content) {
    validateId2(id);
    if (!this.token) {
      throw new Error("Authentication required to write");
    }
    const entry = this.registry.get(id);
    if (!entry) throw new Error(`Deck not found: ${id}`);
    const fileSha = await this.getFileSha(entry.path);
    const baseBranch = this.ref ?? await this.getDefaultBranch();
    const headSha = await this.getBranchSha(baseBranch);
    const branchName = `dekk-edit-${Date.now()}`;
    await this.createBranch(branchName, headSha);
    await this.updateFile(entry.path, content, fileSha, branchName);
    const prUrl = await this.createPR(branchName, baseBranch, id);
    this.cache.set(id, content);
    return { prUrl };
  }
  async dispose() {
    this.cache.clear();
    this.registry.clear();
  }
  // ---------------------------------------------------------------------------
  // Private helpers — API calls
  // ---------------------------------------------------------------------------
  headers() {
    const h = {
      Accept: "application/vnd.github.v3+json"
    };
    if (this.token) {
      h["Authorization"] = `Bearer ${this.token}`;
    }
    return h;
  }
  async apiFetch(path3) {
    const url = `${this.apiBase}${path3}`;
    const res = await fetch(url, { headers: this.headers() });
    if (res.status === 403) {
      const remaining = res.headers.get("X-RateLimit-Remaining");
      if (remaining === "0") {
        throw new Error(
          "GitHub API rate limit exceeded. Use a personal access token or wait."
        );
      }
    }
    return res;
  }
  /** Throw a sanitised error if response is not ok. */
  assertOk(res, prefix) {
    if (!res.ok) {
      throw new Error(this.sanitise(`${prefix}: ${res.status}`));
    }
  }
  /** Strip any token fragments from a string before surfacing it. */
  sanitise(msg) {
    if (!this.token) return msg;
    return msg.replaceAll(this.token, "***");
  }
  async fetchFileContent(filePath) {
    const refParam = this.ref ? `?ref=${encodeURIComponent(this.ref)}` : "";
    const apiPath = `/repos/${enc(this.owner)}/${enc(this.repo)}/contents/${filePath}${refParam}`;
    const res = await this.apiFetch(apiPath);
    if (!res.ok) {
      throw new Error(this.sanitise(`Failed to fetch ${filePath}: ${res.status}`));
    }
    const body = await res.json();
    return Buffer.from(body.content, "base64").toString("utf-8");
  }
  async getFileSha(filePath) {
    const refParam = this.ref ? `?ref=${encodeURIComponent(this.ref)}` : "";
    const apiPath = `/repos/${enc(this.owner)}/${enc(this.repo)}/contents/${filePath}${refParam}`;
    const res = await this.apiFetch(apiPath);
    this.assertOk(res, "Failed to get file SHA");
    const body = await res.json();
    return body.sha;
  }
  async getDefaultBranch() {
    const apiPath = `/repos/${enc(this.owner)}/${enc(this.repo)}`;
    const res = await this.apiFetch(apiPath);
    this.assertOk(res, "Failed to get repository info");
    const body = await res.json();
    return body.default_branch;
  }
  async getBranchSha(branch) {
    const apiPath = `/repos/${enc(this.owner)}/${enc(this.repo)}/branches/${enc(branch)}`;
    const res = await this.apiFetch(apiPath);
    this.assertOk(res, "Failed to get branch info");
    const body = await res.json();
    return body.commit.sha;
  }
  async createBranch(name, sha) {
    const apiPath = `/repos/${enc(this.owner)}/${enc(this.repo)}/git/refs`;
    const res = await fetch(`${this.apiBase}${apiPath}`, {
      method: "POST",
      headers: {
        ...this.headers(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ref: `refs/heads/${name}`, sha })
    });
    if (!res.ok) {
      throw new Error(this.sanitise(`Failed to create branch: ${res.status}`));
    }
  }
  async updateFile(filePath, content, sha, branch) {
    const apiPath = `/repos/${enc(this.owner)}/${enc(this.repo)}/contents/${filePath}`;
    const res = await fetch(`${this.apiBase}${apiPath}`, {
      method: "PUT",
      headers: {
        ...this.headers(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Update deck: ${filePath}`,
        content: Buffer.from(content, "utf-8").toString("base64"),
        sha,
        branch
      })
    });
    if (!res.ok) {
      throw new Error(this.sanitise(`Failed to update file: ${res.status}`));
    }
  }
  async createPR(branch, base, deckId) {
    const apiPath = `/repos/${enc(this.owner)}/${enc(this.repo)}/pulls`;
    const res = await fetch(`${this.apiBase}${apiPath}`, {
      method: "POST",
      headers: {
        ...this.headers(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: `[dekk] Update deck: ${deckId}`,
        body: `Automated update of deck \`${deckId}\` via Dekk CLI.`,
        head: branch,
        base
      })
    });
    if (!res.ok) {
      throw new Error(this.sanitise(`Failed to create PR: ${res.status}`));
    }
    const body = await res.json();
    return body.html_url;
  }
};
function enc(segment) {
  return encodeURIComponent(segment);
}
function validateId2(id) {
  if (!VALID_ID_PATTERN.test(id)) {
    throw new Error(`Invalid deck ID: "${id}". Must match [a-zA-Z0-9_-]+`);
  }
}
function extractFrontmatter2(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return {};
  const result = {};
  const lines = match[1].split("\n");
  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      if (key === "title") result.title = value;
      if (key === "author") result.author = value;
    }
  }
  return result;
}
function countSlides2(markdown) {
  let body = markdown;
  const fmMatch = markdown.match(/^---\n[\s\S]*?\n---\n/);
  if (fmMatch) {
    body = markdown.slice(fmMatch[0].length);
  }
  if (!body.trim()) return 0;
  const lines = body.split("\n");
  let slideCount = 1;
  for (const line of lines) {
    if (THEMATIC_BREAK_LINE2.test(line)) {
      slideCount++;
    }
  }
  return slideCount;
}

// cli/server.ts
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
var MAX_BODY_SIZE = 10 * 1024 * 1024;
var MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8"
};
var SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'"
};
var VALID_ID_PATTERN2 = /^[a-zA-Z0-9_-]+$/;
function setSecurityHeaders(res) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(key, value);
  }
}
function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(body);
}
function sendText(res, status, text, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(text);
}
function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}
function readBody(req, limit) {
  return new Promise((resolve2, reject) => {
    const chunks = [];
    let size = 0;
    let rejected = false;
    req.on("data", (chunk) => {
      if (rejected) return;
      size += chunk.length;
      if (size > limit) {
        rejected = true;
        reject(new Error("BODY_TOO_LARGE"));
        req.resume();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!rejected) {
        resolve2(Buffer.concat(chunks).toString("utf-8"));
      }
    });
    req.on("error", (err) => {
      if (!rejected) {
        reject(err);
      }
    });
  });
}
function extractIdFromPath(pathname, prefix) {
  const rest = pathname.slice(prefix.length);
  if (!rest || rest.includes("/")) return null;
  const decoded = decodeURIComponent(rest);
  if (!VALID_ID_PATTERN2.test(decoded)) return null;
  return decoded;
}
function createServer(source, distDir, port) {
  const resolvedDistDir = path.resolve(distDir);
  let indexHtml = "";
  const indexHtmlReady = fs.readFile(path.join(resolvedDistDir, "index.html"), "utf-8").then(
    (content) => {
      const metaTags = `<meta name="dekk-mode" content="cli"><meta name="dekk-source" content="${source.sourceType}">`;
      indexHtml = content.replace("<head>", `<head>${metaTags}`);
    },
    () => {
      indexHtml = "";
    }
  );
  const handler = async (req, res) => {
    setSecurityHeaders(res);
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const pathname = url.pathname;
    const method = req.method ?? "GET";
    if (pathname === "/api/decks" && method === "GET") {
      const decks = await source.listDecks();
      sendJson(res, 200, decks);
      return;
    }
    if (pathname.startsWith("/api/deck/") && method === "GET") {
      const id = extractIdFromPath(pathname, "/api/deck/");
      if (!id) {
        sendError(res, 400, "Invalid deck ID");
        return;
      }
      try {
        const markdown = await source.readDeck(id);
        sendText(res, 200, markdown, "text/markdown; charset=utf-8");
      } catch {
        sendError(res, 404, "Deck not found");
      }
      return;
    }
    if (pathname.startsWith("/api/write/") && method === "POST") {
      const id = extractIdFromPath(pathname, "/api/write/");
      if (!id) {
        sendError(res, 400, "Invalid deck ID");
        return;
      }
      const contentType = req.headers["content-type"] ?? "";
      if (!contentType.includes("application/json")) {
        sendError(res, 415, "Content-Type must be application/json");
        return;
      }
      let body;
      try {
        body = await readBody(req, MAX_BODY_SIZE);
      } catch (err) {
        if (err instanceof Error && err.message === "BODY_TOO_LARGE") {
          sendError(res, 413, "Request body too large");
          return;
        }
        sendError(res, 400, "Failed to read request body");
        return;
      }
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        sendError(res, 400, "Invalid JSON");
        return;
      }
      if (typeof parsed.content !== "string") {
        sendError(res, 400, 'Missing or invalid "content" field');
        return;
      }
      const result = await source.writeDeck(id, parsed.content);
      sendJson(res, 200, result);
      return;
    }
    if (pathname.startsWith("/api/")) {
      sendError(res, 404, "Not found");
      return;
    }
    await indexHtmlReady;
    let filePath = path.join(resolvedDistDir, pathname === "/" ? "index.html" : pathname);
    filePath = path.resolve(filePath);
    if (!filePath.startsWith(resolvedDistDir)) {
      sendError(res, 403, "Forbidden");
      return;
    }
    const relative2 = path.relative(resolvedDistDir, filePath);
    if (relative2.split(path.sep).some((segment) => segment.startsWith("."))) {
      sendError(res, 403, "Forbidden");
      return;
    }
    const indexHtmlPath = path.join(resolvedDistDir, "index.html");
    if (filePath === indexHtmlPath) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(indexHtml);
      return;
    }
    try {
      const stat3 = await fs.stat(filePath);
      if (stat3.isDirectory()) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(indexHtml);
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME_TYPES[ext] ?? "application/octet-stream";
      const content = await fs.readFile(filePath);
      res.writeHead(200, { "Content-Type": mime });
      res.end(content);
    } catch {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(indexHtml);
    }
  };
  const server = http.createServer((req, res) => {
    handler(req, res).catch((err) => {
      const message = err instanceof Error ? err.message : "Internal server error";
      if (!res.headersSent) {
        sendError(res, 500, message);
      }
    });
  });
  server.timeout = 3e4;
  server.headersTimeout = 1e4;
  server.listen(port, "127.0.0.1");
  return server;
}

// cli/url-parser.ts
var VALID_SEGMENT = /^[a-zA-Z0-9_.-]+$/;
var MULTI_SEGMENT_PREFIXES = /* @__PURE__ */ new Set([
  "feature",
  "fix",
  "hotfix",
  "bugfix",
  "release",
  "chore",
  "docs",
  "dependabot"
]);
function parseGitHubUrl(input, refOverride) {
  let url;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") {
    return null;
  }
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    return null;
  }
  const owner = segments[0];
  const repo = segments[1];
  if (!VALID_SEGMENT.test(owner) || !VALID_SEGMENT.test(repo)) {
    return null;
  }
  const host = url.hostname;
  if (segments.length === 2) {
    return {
      host,
      owner,
      repo,
      ref: refOverride,
      path: "/"
    };
  }
  if (segments[2] !== "tree") {
    return {
      host,
      owner,
      repo,
      ref: refOverride,
      path: "/"
    };
  }
  const afterTree = segments.slice(3);
  if (afterTree.length === 0) {
    return {
      host,
      owner,
      repo,
      ref: refOverride,
      path: "/"
    };
  }
  let parsedRef;
  let pathSegments;
  const firstRefSegment = afterTree[0];
  if (MULTI_SEGMENT_PREFIXES.has(firstRefSegment) && afterTree.length >= 2) {
    parsedRef = `${afterTree[0]}/${afterTree[1]}`;
    pathSegments = afterTree.slice(2);
  } else {
    parsedRef = afterTree[0];
    pathSegments = afterTree.slice(1);
  }
  const ref = refOverride ?? parsedRef;
  const path3 = pathSegments.length > 0 ? pathSegments.join("/") : "/";
  return { host, owner, repo, ref, path: path3 };
}

// cli/auth.ts
import { readFile as readFile2, mkdir, open as fsOpen } from "node:fs/promises";
import { join as join2 } from "node:path";
import { homedir } from "node:os";
import { createInterface } from "node:readline";
var DEFAULT_CONFIG_DIR = join2(homedir(), ".config", "dekk");
var AUTH_FILE = "auth.json";
var TOKEN_MAX_AGE_DAYS = 90;
function getConfigDir(override) {
  return override ?? DEFAULT_CONFIG_DIR;
}
function authFilePath(configDir) {
  return join2(configDir, AUTH_FILE);
}
async function readAuthData(configDir) {
  try {
    const raw = await readFile2(authFilePath(configDir), "utf-8");
    const data = JSON.parse(raw);
    if (typeof data !== "object" || data === null || !("hosts" in data) || typeof data.hosts !== "object" || data.hosts === null) {
      return { hosts: {} };
    }
    return data;
  } catch {
    return { hosts: {} };
  }
}
async function writeAuthData(configDir, data) {
  await mkdir(configDir, { recursive: true });
  const filePath = authFilePath(configDir);
  const content = JSON.stringify(data, null, 2);
  const fd = await fsOpen(filePath, "w", 384);
  try {
    await fd.writeFile(content, "utf-8");
    await fd.datasync();
  } finally {
    await fd.close();
  }
}
async function getToken(host, configDir) {
  const dir = getConfigDir(configDir);
  const data = await readAuthData(dir);
  const entry = data.hosts[host];
  if (!entry || typeof entry.token !== "string") {
    return null;
  }
  return entry.token;
}
async function saveToken(host, token, user, configDir) {
  const dir = getConfigDir(configDir);
  const data = await readAuthData(dir);
  data.hosts[host] = {
    token,
    user,
    savedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await writeAuthData(dir, data);
}
async function deleteToken(host, configDir) {
  const dir = getConfigDir(configDir);
  const data = await readAuthData(dir);
  if (host !== void 0) {
    delete data.hosts[host];
  } else {
    data.hosts = {};
  }
  await writeAuthData(dir, data);
}
async function isTokenOld(host, configDir) {
  const dir = getConfigDir(configDir);
  const data = await readAuthData(dir);
  const entry = data.hosts[host];
  if (!entry || typeof entry.savedAt !== "string") {
    return false;
  }
  const savedAt = new Date(entry.savedAt);
  const now = /* @__PURE__ */ new Date();
  const ageMs = now.getTime() - savedAt.getTime();
  const ageDays = ageMs / (1e3 * 60 * 60 * 24);
  return ageDays > TOKEN_MAX_AGE_DAYS;
}
async function promptForToken(host) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stderr
  });
  return new Promise((resolve2, reject) => {
    rl.question(
      `Enter personal access token for ${host}: `,
      (answer) => {
        rl.close();
        const trimmed = answer.trim();
        if (trimmed.length === 0) {
          reject(new Error("Token cannot be empty"));
          return;
        }
        resolve2(trimmed);
      }
    );
  });
}

// cli/index.ts
var execFileAsync = promisify(execFile);
var execAsync = promisify(exec);
function parseArgs(argv) {
  const args = {
    port: 3e3,
    open: true
  };
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    switch (arg) {
      case "--version":
      case "-v":
        args.command = "version";
        i++;
        continue;
      case "--help":
      case "-h":
        args.command = "help";
        i++;
        continue;
      case "--update":
        args.command = "update";
        i++;
        continue;
      case "--logout": {
        args.command = "logout";
        i++;
        const nextLogout = argv[i];
        if (nextLogout !== void 0 && !nextLogout.startsWith("-")) {
          args.logoutHost = nextLogout;
          i++;
        }
        continue;
      }
      case "--port":
      case "-p": {
        i++;
        const portStr = argv[i];
        if (portStr === void 0) {
          throw new Error("--port requires a number argument");
        }
        const port = Number(portStr);
        if (!Number.isFinite(port) || port < 1 || port > 65535) {
          throw new Error(`Invalid port number: ${portStr}`);
        }
        args.port = port;
        i++;
        continue;
      }
      case "--no-open":
        args.open = false;
        i++;
        continue;
      case "--ref": {
        i++;
        const refVal = argv[i];
        if (refVal === void 0) {
          throw new Error("--ref requires a value");
        }
        args.ref = refVal;
        i++;
        continue;
      }
      default:
        if (!arg.startsWith("-")) {
          args.source = arg;
          args.type = arg.startsWith("https://") ? "github" : "local";
          i++;
          continue;
        }
        throw new Error(`Unknown flag: ${arg}`);
    }
  }
  if (!args.command && !args.source) {
    throw new Error(
      'Missing required argument. Run "dekk --help" for usage information.'
    );
  }
  return args;
}
var HELP_TEXT = `Usage: dekk <path-or-url> [options]

Arguments:
  <path-or-url>    Local directory or GitHub URL containing decks

Options:
  --port, -p <n>   Port to serve on (default: 3000)
  --ref <ref>       Git ref to use for GitHub sources
  --no-open         Don't open browser automatically

Commands:
  --version, -v     Print version and exit
  --help, -h        Print this help message and exit
  --update          Update dekk via Homebrew
  --logout [host]   Remove stored credentials

Examples:
  dekk ./my-talks
  dekk https://github.com/org/repo/tree/main/decks
  dekk --port 8080 ./talks
  dekk --ref feature/new-talk https://github.com/org/repo`;
async function getVersion() {
  const thisFile = fileURLToPath(import.meta.url);
  const packageJsonPath = path2.resolve(path2.dirname(thisFile), "..", "package.json");
  const content = await readFile3(packageJsonPath, "utf-8");
  const pkg = JSON.parse(content);
  return pkg.version;
}
async function handleVersion() {
  const version = await getVersion();
  console.log(`dekk ${version}`);
}
function handleHelp() {
  console.log(HELP_TEXT);
}
async function handleUpdate() {
  console.log("Updating dekk via Homebrew...");
  try {
    const { stdout } = await execFileAsync("brew", ["upgrade", "dulvac/tap/dekk"]);
    console.log(stdout);
    console.log("Update complete.");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Update failed: ${message}`);
    process.exit(1);
  }
}
async function handleLogout(host) {
  await deleteToken(host);
  if (host) {
    console.log(`Credentials removed for ${host}`);
  } else {
    console.log("All stored credentials removed");
  }
}
async function handleServe(args) {
  if (!args.source || !args.type) {
    throw new Error("No source specified");
  }
  let source;
  if (args.type === "github") {
    const parsed = parseGitHubUrl(args.source, args.ref);
    if (!parsed) {
      throw new Error(`Invalid GitHub URL: ${args.source}`);
    }
    let token = await getToken(parsed.host);
    if (token) {
      const old = await isTokenOld(parsed.host);
      if (old) {
        console.warn(`Warning: Token for ${parsed.host} is over 90 days old. Consider refreshing it.`);
      }
    }
    source = new GitHubSource({
      host: parsed.host,
      owner: parsed.owner,
      repo: parsed.repo,
      path: parsed.path,
      ref: parsed.ref,
      token: token ?? void 0
    });
    try {
      await source.listDecks();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("401") || msg.includes("403")) {
        console.log(`Authentication required for ${parsed.host}`);
        token = await promptForToken(parsed.host);
        await saveToken(parsed.host, token, "cli-user");
        await source.dispose();
        source = new GitHubSource({
          host: parsed.host,
          owner: parsed.owner,
          repo: parsed.repo,
          path: parsed.path,
          ref: parsed.ref,
          token
        });
      } else {
        throw err;
      }
    }
  } else {
    const sourcePath = path2.resolve(args.source);
    let sourceStat;
    try {
      sourceStat = await stat2(sourcePath);
    } catch {
      throw new Error(`Path does not exist: ${sourcePath}`);
    }
    if (!sourceStat.isDirectory()) {
      throw new Error(`Path is not a directory: ${sourcePath}`);
    }
    source = new LocalSource(sourcePath);
  }
  const thisFile = fileURLToPath(import.meta.url);
  const distDir = path2.resolve(path2.dirname(thisFile), "..", "dist");
  const server = createServer(source, distDir, args.port);
  const url = `http://127.0.0.1:${args.port}`;
  console.log(`Serving decks from ${args.source}`);
  console.log(`Open ${url} in your browser`);
  if (args.open) {
    execAsync(`open ${url}`).catch(() => {
    });
  }
  const shutdown = () => {
    console.log("\nShutting down...");
    server.close(() => {
      source.dispose().then(
        () => process.exit(0),
        () => process.exit(1)
      );
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
async function main() {
  const args = parseArgs(process.argv.slice(2));
  switch (args.command) {
    case "version":
      await handleVersion();
      return;
    case "help":
      handleHelp();
      return;
    case "update":
      await handleUpdate();
      return;
    case "logout":
      await handleLogout(args.logoutHost);
      return;
    default:
      await handleServe(args);
  }
}
var isDirectRun = !process.env["VITEST"];
if (isDirectRun) {
  main().catch((err) => {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(message);
    process.exit(1);
  });
}
export {
  parseArgs
};
