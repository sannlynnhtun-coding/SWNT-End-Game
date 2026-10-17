import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

test('CSP authorizes the real JSON-LD without allowing arbitrary inline scripts', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'))
  const headers = config.headers.find(rule => rule.source === '/(.*)').headers
  const policy = headers.find(header => header.key === 'Content-Security-Policy').value
  const scriptPolicy = policy.split(';').map(value => value.trim()).find(value => value.startsWith('script-src '))
  assert.ok(!scriptPolicy.includes("'unsafe-inline'") && !scriptPolicy.includes("'unsafe-eval'"))
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]
  const hash = createHash('sha256').update(jsonLd).digest('base64')
  assert.ok(scriptPolicy.includes(`'sha256-${hash}'`), 'Update the JSON-LD CSP hash when its content changes')
  assert.ok(policy.includes("frame-ancestors 'none'"))
})
