import { createHash, timingSafeEqual } from 'node:crypto'

export function configuredCoachLogin(username, password, env = process.env) {
  const configuredName = env.COACH_USERNAME?.trim()
  const configuredPassword = env.COACH_PASSWORD
  if (!configuredName || !configuredPassword || typeof username !== 'string' || typeof password !== 'string') return null
  if (username.trim().toLowerCase() !== configuredName.toLowerCase()) return null
  const digest = (value) => createHash('sha256').update(value).digest()
  if (!timingSafeEqual(digest(password), digest(configuredPassword))) return null
  return { id: 'configured-coach', firstName: configuredName, lastName: '', email: configuredName, role: 'coach', division: '', team: '' }
}
