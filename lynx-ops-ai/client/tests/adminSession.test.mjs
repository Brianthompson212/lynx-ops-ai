import test from 'node:test'
import assert from 'node:assert/strict'
import { createInvite, getAdminDirectory, updateProfileRole, setStoredAdminToken, getStoredAdminToken } from '../src/api.js'

const storage = new Map()
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
}

test('all admin requests invalidate a rejected session and request reauthentication', async () => {
  for (const request of [() => createInvite({ email: 'coach@example.com', role: 'coach' }), getAdminDirectory, () => updateProfileRole('profile', 'coach')]) {
    setStoredAdminToken('expired-token')
    globalThis.fetch = async (_url, options) => {
      assert.equal(options.headers.Authorization, 'Bearer expired-token')
      return { ok: false, status: 401, json: async () => ({ error: 'Admin login required.' }) }
    }
    await assert.rejects(request, (error) => error.code === 'ADMIN_SESSION_EXPIRED' && /sign in again/.test(error.message))
    assert.equal(getStoredAdminToken(), '')
  }
})

test('valid admin requests send the token and preserve the invite payload', async () => {
  const invite = { email: 'coach@example.com', role: 'coach', team: 'Gold' }
  setStoredAdminToken('valid-token')
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer valid-token')
    assert.deepEqual(JSON.parse(options.body), invite)
    return { ok: true, status: 200, json: async () => ({ inviteLink: 'https://example.com/?invite=test' }) }
  }
  assert.equal((await createInvite(invite)).inviteLink, 'https://example.com/?invite=test')
  assert.equal(getStoredAdminToken(), 'valid-token')
})

test('ordinary server errors keep the session', async () => {
  setStoredAdminToken('valid-token')
  globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({ error: 'Storage unavailable' }) })
  await assert.rejects(getAdminDirectory, /Storage unavailable/)
  assert.equal(getStoredAdminToken(), 'valid-token')
})
