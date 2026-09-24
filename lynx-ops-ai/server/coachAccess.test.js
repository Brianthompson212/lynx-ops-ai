import test from 'node:test'
import assert from 'node:assert/strict'
import { configuredCoachLogin } from './coachAccess.js'
const env = { COACH_USERNAME: 'TestCoach', COACH_PASSWORD: 'test-only-secret' }
test('configured coach can sign in without a stored invitation and has only coach access', () => {
  const profile = configuredCoachLogin(' testcoach ', 'test-only-secret', env)
  assert.equal(profile.role, 'coach')
  assert.equal(profile.firstName, 'TestCoach')
  assert.equal(Object.hasOwn(profile, 'password'), false)
})
test('disabled, incorrect and malformed credentials cannot authenticate', () => {
  for (const [username, password, config] of [['TestCoach', 'wrong', env], ['wrong', 'test-only-secret', env], ['TestCoach', 'test-only-secret', {}], ['TestCoach', '', { COACH_USERNAME: 'TestCoach' }], [null, 'test-only-secret', env], ['TestCoach', {}, env]]) {
    assert.equal(configuredCoachLogin(username, password, config), null)
  }
})

test('fallback rejects incorrect passwords and can be disabled or replaced', () => {
  assert.equal(configuredCoachLogin('Lynxcoach', 'wrong', {}), null)
  assert.equal(configuredCoachLogin('Lynxcoach', 'wrong', { COACH_LOGIN_DISABLED: 'true' }), null)
  assert.equal(configuredCoachLogin('TestCoach', 'test-only-secret', { ...env, COACH_LOGIN_DISABLED: 'true' }), null)
  assert.equal(configuredCoachLogin('Lynxcoach', 'test-only-secret', env), null)
})
