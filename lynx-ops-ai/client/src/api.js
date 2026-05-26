const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'
const ADMIN_TOKEN_KEY = 'lynx-admin-token'
const USER_TOKEN_KEY = 'lynx-user-token'
const USER_PROFILE_KEY = 'lynx-user-profile'
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
export const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY ?? ''
export const GOOGLE_CALENDAR_ID = import.meta.env.VITE_GOOGLE_CALENDAR_ID ?? ''

export function getStoredAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) ?? ''
}

export function setStoredAdminToken(token) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token)
}

export function clearStoredAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY)
}

export function getStoredUserSession() {
  try {
    return {
      token: localStorage.getItem(USER_TOKEN_KEY) ?? '',
      profile: JSON.parse(localStorage.getItem(USER_PROFILE_KEY) ?? 'null'),
    }
  } catch {
    return { token: '', profile: null }
  }
}

export function setStoredUserSession(token, profile) {
  localStorage.setItem(USER_TOKEN_KEY, token)
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile))
}

export function clearStoredUserSession() {
  localStorage.removeItem(USER_TOKEN_KEY)
  localStorage.removeItem(USER_PROFILE_KEY)
}

function adminHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getStoredAdminToken()}`,
  }
}

export async function generateContent(toolType, formData) {
  const response = await fetch(`${API_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ toolType, formData }),
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error ?? 'Unable to generate content. Please try again.')
  }

  return payload.text
}

export async function generateGameDayBackground(formData) {
  const response = await fetch(`${API_BASE_URL}/api/game-day-background`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ formData }),
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error ?? 'Unable to generate game day background.')
  }

  return payload.imageDataUrl
}

export async function loginAdmin(credentials) {
  const response = await fetch(`${API_BASE_URL}/api/auth/admin-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error ?? 'Unable to log in.')
  }

  setStoredAdminToken(payload.token)
  return payload
}

export async function loginUser(credentials) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error ?? 'Unable to log in.')
  }

  setStoredUserSession(payload.token, payload.profile)
  return payload
}

export async function getAdminDirectory() {
  const response = await fetch(`${API_BASE_URL}/api/admin/directory`, {
    headers: adminHeaders(),
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error ?? 'Unable to load directory.')
  }

  return payload
}

export async function createInvite(invite) {
  const response = await fetch(`${API_BASE_URL}/api/admin/invites`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify(invite),
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error ?? 'Unable to create invite.')
  }

  return payload
}

export async function getInvite(token) {
  const response = await fetch(`${API_BASE_URL}/api/invites/${encodeURIComponent(token)}`)
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error ?? 'Unable to load invite.')
  }

  return payload.invite
}

export async function registerInvite(payload) {
  const response = await fetch(`${API_BASE_URL}/api/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const responsePayload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(responsePayload.error ?? 'Unable to complete registration.')
  }

  return responsePayload.profile
}

export async function updateProfileRole(profileId, role) {
  const response = await fetch(`${API_BASE_URL}/api/admin/profiles/${encodeURIComponent(profileId)}/role`, {
    method: 'PATCH',
    headers: adminHeaders(),
    body: JSON.stringify({ role }),
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error ?? 'Unable to update profile role.')
  }

  return payload.profile
}
