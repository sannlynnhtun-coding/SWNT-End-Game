import test from 'node:test'
import assert from 'node:assert/strict'
import { onlineError } from '../src/onlineError.js'

test('unexpected backend diagnostics and arbitrary messages never reach the UI', () => {
  const fallback = onlineError(null)
  for (const error of [
    { code: '23514', message: 'new row violates check constraint private_relation_check' },
    { message: '<script>alert(document.cookie)</script>' },
    { message: 'password=secret access_token=private' },
    {},
  ]) assert.equal(onlineError(error), fallback)
})

test('rate limits and known auth failures have safe actionable messages', () => {
  const fallback = onlineError(null)
  const limit = onlineError({ message: 'result_submission_limit' })
  assert.notEqual(limit, fallback)
  assert.equal(onlineError({ status: 429, message: 'private backend details' }), limit)
  assert.notEqual(onlineError({ code: 'email_not_confirmed' }), fallback)
  assert.equal(onlineError({ code: 'invalid_credentials' }), onlineError({ message: 'Invalid login credentials' }))
})

