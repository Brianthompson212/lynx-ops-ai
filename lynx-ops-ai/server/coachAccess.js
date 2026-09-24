import { createHash, scryptSync, timingSafeEqual } from 'node:crypto'

// Coach-only fallback. Explicit environment credentials replace this login.
const fallbackName = 'Lynxcoach'
const fallbackSalt = '23e8bf84c181eaabc6e0fc7a2e73cb08'
const fallbackHash = 'b18cc2ea318c3c4ce386f08e099e7afb968c7724ddd179f0551f8b00d2cd813329a248ddc3214699b2e4a650640087f706da9fed6ba48eebcf1a7e79669a4f66'

export function configuredCoachLogin(username, password, env = process.env) {
  if (typeof username !== 'string' || typeof password !== 'string') return null
  if (env.COACH_LOGIN_DISABLED === 'true') return null
  const hasOverride = Boolean(env.COACH_USERNAME?.trim() || env.COACH_PASSWORD)
  const configuredName = hasOverride ? env.COACH_USERNAME?.trim() : fallbackName
  const configuredPassword = env.COACH_PASSWORD
  if (!configuredName || (hasOverride && !configuredPassword)) return null
  if (username.trim().toLowerCase() !== configuredName.toLowerCase()) return null
  const digest = (value) => createHash('sha256').update(value).digest()
  const valid = hasOverride
    ? timingSafeEqual(digest(password), digest(configuredPassword))
    : timingSafeEqual(scryptSync(password, fallbackSalt, 64), Buffer.from(fallbackHash, 'hex'))
  if (!valid) return null
  return { id: 'configured-coach', firstName: configuredName, lastName: '', email: configuredName, role: 'coach', division: '', team: '' }
}
