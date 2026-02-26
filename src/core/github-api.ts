const API_BASE = 'https://api.github.com'

function toBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
}

async function githubFetch(
  url: string,
  token: string,
  options: RequestInit = {}
): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`)
  }

  return response
}

export async function getDefaultBranch(
  owner: string,
  repo: string,
  token: string
): Promise<string> {
  const o = encodeURIComponent(owner)
  const r = encodeURIComponent(repo)
  const response = await githubFetch(`${API_BASE}/repos/${o}/${r}`, token)
  const data = await response.json()
  return data.default_branch
}

export async function getFileContents(
  owner: string,
  repo: string,
  path: string,
  ref: string,
  token: string
): Promise<{ sha: string; content: string }> {
  const o = encodeURIComponent(owner)
  const r = encodeURIComponent(repo)
  const encodedPath = path.split('/').map(encodeURIComponent).join('/')
  const response = await githubFetch(
    `${API_BASE}/repos/${o}/${r}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`,
    token
  )
  const data = await response.json()
  return { sha: data.sha, content: data.content }
}

export async function getBranchHead(
  owner: string,
  repo: string,
  branch: string,
  token: string
): Promise<string> {
  const o = encodeURIComponent(owner)
  const r = encodeURIComponent(repo)
  const encodedBranch = branch.split('/').map(encodeURIComponent).join('/')
  const response = await githubFetch(
    `${API_BASE}/repos/${o}/${r}/git/ref/heads/${encodedBranch}`,
    token
  )
  const data = await response.json()
  return data.object.sha
}

export async function createBranch(
  owner: string,
  repo: string,
  branchName: string,
  sha: string,
  token: string
): Promise<void> {
  const o = encodeURIComponent(owner)
  const r = encodeURIComponent(repo)
  await githubFetch(`${API_BASE}/repos/${o}/${r}/git/refs`, token, {
    method: 'POST',
    body: JSON.stringify({
      ref: `refs/heads/${branchName}`,
      sha,
    }),
  })
}

export async function updateFileContents(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  sha: string,
  branch: string,
  token: string
): Promise<void> {
  const o = encodeURIComponent(owner)
  const r = encodeURIComponent(repo)
  const encodedPath = path.split('/').map(encodeURIComponent).join('/')
  await githubFetch(`${API_BASE}/repos/${o}/${r}/contents/${encodedPath}`, token, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: toBase64(content),
      sha,
      branch,
    }),
  })
}

export async function createPullRequest(
  owner: string,
  repo: string,
  title: string,
  body: string,
  head: string,
  base: string,
  token: string
): Promise<{ url: string; number: number }> {
  const o = encodeURIComponent(owner)
  const r = encodeURIComponent(repo)
  const response = await githubFetch(`${API_BASE}/repos/${o}/${r}/pulls`, token, {
    method: 'POST',
    body: JSON.stringify({
      title,
      body,
      head,
      base,
    }),
  })
  const data = await response.json()
  return { url: data.html_url, number: data.number }
}
