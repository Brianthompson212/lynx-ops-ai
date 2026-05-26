import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { createHmac, pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import OpenAI from 'openai'

const app = express()
const port = process.env.PORT ?? 3001
const dataDirectory = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), 'data')
const directoryFile = path.join(dataDirectory, 'lynx-directory.json')
const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173'
const profileRoles = ['parent', 'coach', 'admin']
const authSecret = process.env.AUTH_SECRET ?? 'dev-only-change-me'
const adminEmail = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase()
const adminPassword = process.env.ADMIN_PASSWORD ?? ''

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const hasConfiguredApiKey = () =>
  process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_api_key_here'

function base64Url(input) {
  return Buffer.from(input).toString('base64url')
}

function signToken(payload) {
  const encodedPayload = base64Url(JSON.stringify(payload))
  const signature = createHmac('sha256', authSecret).update(encodedPayload).digest('base64url')
  return `${encodedPayload}.${signature}`
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null

  const [encodedPayload, signature] = token.split('.')
  const expectedSignature = createHmac('sha256', authSecret).update(encodedPayload).digest('base64url')
  const provided = Buffer.from(signature)
  const expected = Buffer.from(expectedSignature)

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'))
    if (payload.expiresAt && Date.now() > payload.expiresAt) return null
    return payload
  } catch {
    return null
  }
}

function requireAdmin(request, response, next) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
  const payload = verifyToken(token)

  if (payload?.role !== 'admin') {
    return response.status(401).json({ error: 'Admin login required.' })
  }

  request.admin = payload
  return next()
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url')
  const hash = pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('base64url')
  return `${salt}.${hash}`
}

function verifyPassword(password, storedPasswordHash) {
  if (!password || !storedPasswordHash || !storedPasswordHash.includes('.')) return false

  const [salt, savedHash] = storedPasswordHash.split('.')
  const hash = pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('base64url')
  const provided = Buffer.from(hash)
  const expected = Buffer.from(savedHash)

  return provided.length === expected.length && timingSafeEqual(provided, expected)
}

app.use(cors({ origin: clientOrigin }))
app.use(express.json({ limit: '1mb' }))

async function readDirectory() {
  try {
    const contents = await fs.readFile(directoryFile, 'utf8')
    return JSON.parse(contents)
  } catch {
    return { invites: [], profiles: [] }
  }
}

async function writeDirectory(directory) {
  await fs.mkdir(dataDirectory, { recursive: true })
  await fs.writeFile(directoryFile, JSON.stringify(directory, null, 2))
}

function sanitizeInvite(invite) {
  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    division: invite.division,
    team: invite.team,
    status: invite.status,
    createdAt: invite.createdAt,
    acceptedAt: invite.acceptedAt,
  }
}

function sanitizeProfile(profile) {
  return {
    id: profile.id,
    role: profile.role,
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    phone: profile.phone,
    secondaryEmail: profile.secondaryEmail,
    secondaryPhone: profile.secondaryPhone,
    division: profile.division,
    team: profile.team,
    athleteName: profile.athleteName,
    emergencyContact: profile.emergencyContact,
    emergencyPhone: profile.emergencyPhone,
    coachTitle: profile.coachTitle,
    waiver: profile.waiver,
    createdAt: profile.createdAt,
  }
}

const toolPrompts = {
  'parent-message': (formData) => `
You are helping a youth softball coach write a parent-ready team message for Lynx Ops AI.

Create a short parent text message using the Lynx softball voice.
It should feel warm, clear, upbeat, and a little fun without being too long.
Do not include sensitive child information. Keep player language encouraging and appropriate for families.

Details:
- Message type: ${formData.messageType || 'General parent update'}
- Date: ${formData.date || 'Not provided'}
- Time: ${formData.time || 'Not provided'}
- Location: ${formData.location || 'Not provided'}
- Field name: ${formData.fieldName || 'Not provided'}
- Baseline side: ${formData.baselineSide || 'Not provided'}
- Key notes: ${formData.keyNotes || 'Not provided'}
- Tone: ${formData.tone || 'friendly'}

Use this general template:

Good morning/afternoon/evening Lynx family!

[One short opening line about the event or reason for the message.]

Please be at [location/field] ready for [warmups/practice/game] at [time].

[One short field/location/detail line from the notes. Include the baseline side clearly if provided, such as "We will be on Field 4, 3rd baseline side."]

[One fun Lynx-style hype line if the tone allows it.]

Let's finish strong Lynx! Purple and gold energy.

Rules:
- Return only the message draft.
- Keep it text-message friendly.
- Use short paragraphs with blank lines between them.
- If the tone is "short", keep it very direct and skip the extra hype line.
- If opponent or theme details are in the notes, use them for a playful but respectful line.
- If baseline side is "not sure / omit", do not mention a baseline side.
`,
  'practice-plan': (formData) => `
You are helping a youth softball coach create an organized practice plan for Lynx Ops AI.

Keep coaching language development-focused, respectful, and age-appropriate. Avoid collecting or referencing sensitive child information.

Practice details:
- Practice date: ${formData.practiceDate || 'Use today if date is not provided'}
- Age group: ${formData.ageGroup || 'Not provided'}
- Practice start time: ${formData.practiceStartTime || 'Not provided'}
- Practice end time: ${formData.practiceEndTime || 'Not provided'}
- Number of players: ${formData.numberOfPlayers || 'Not provided'}
- Focus areas: ${formData.focusAreas || 'Not provided'}
- Equipment available: ${formData.equipmentAvailable || 'Not provided'}
- Field space available: ${formData.fieldSpaceAvailable || 'Not provided'}
- End with competition: ${formData.endWithCompetition || 'yes'}

Return a short, text-message-friendly practice itinerary.

Style target:
- Clean and professional, but not wordy.
- Similar to a coach text message, not a formal report.
- Use time blocks and bullets.
- Avoid filler sections like "purpose", "setup", "safety notes", or long coaching explanations.
- Keep it easy to copy and send in a team message.

Use this structure:

Start with this exact title format:
[Practice date] Practice Plan

If a practice date is provided, format it as M/D Practice Plan, such as 5/21 Practice Plan.
If no practice date is provided, use today's date.

[Start Time] - Throwing Warm-Ups
- 1-3 quick bullet items

[Next Time] - Team Warm-Up / Athletic Work
- 3-6 quick bullet items

[Next Time] - Stations
Mention station length and when to switch.

Batting Station
- 2-4 quick bullet items

Fielding Station
- 2-4 quick bullet items

Add additional stations only if the player count, focus areas, equipment, or field space clearly calls for them.

[Next Time] - Team Competition
- 1-3 competitive games or challenges if requested

Practice Ends: [End Time]

If group layouts are useful, include a short "Groups" section with simple group counts, such as:
Groups
- Group 1: 6 players
- Group 2: 6 players

Keep the entire output concise. Do not use markdown tables. Do not over-explain drills.
`,
  'game-day-post': (formData) => `
You are helping a youth softball coach write game day communications for Lynx Ops AI.

Use a clean Lynx softball voice with purple/gold team spirit. Keep public-facing language respectful and team-focused. Do not include sensitive child information.

Game details:
- Opponent: ${formData.opponent || 'Not provided'}
- Arrival time: ${formData.arrivalTime || 'Not provided'}
- Game time: ${formData.gameTime || 'Not provided'}
- Place name: ${formData.placeName || 'Not provided'}
- Field: ${formData.field || 'Not provided'}
- Uniform notes: ${formData.uniformNotes || 'Not provided'}
- Theme or pun idea: ${formData.themeOrPunIdea || 'Not provided'}
- Tone: ${formData.tone || 'hype'}

Output one concise parent text message only.

Use this structure:

Game Day Reminder

Opponent:
Arrival:
Game Time:
Place:
Field:
Uniform:

Add 1-2 short closing notes with the requested tone.
Format times in normal 12-hour style, such as 6:00 PM, not military time.
Keep it ready to copy into a parent text message. Do not include an Instagram caption in this text response because the app creates a separate social matchup image.
`,
}

function buildGameDayBackgroundPrompt(formData) {
  const theme = formData.graphicTheme || 'storm night'
  const opponent = formData.opponent || 'the opponent'
  const place = formData.placeName || 'a softball complex'
  const field = formData.field || 'a softball field'
  const time = formData.gameTime || 'evening game time'
  const themeIdea = formData.themeOrPunIdea || 'high-energy game day'

  return `
Create a premium square youth softball game day poster background.

Important composition rules:
- No words, no letters, no numbers, no team names, no logos, no mascots.
- Leave a clean central horizontal zone for two team logos and "VS" text to be overlaid later.
- Leave clear space in the lower-middle for game time and field text to be overlaid later.
- Do not imitate a specific existing poster exactly.

Visual direction:
- Professional sports graphic design, cinematic and polished.
- Theme: ${theme}.
- Purple and gold Lynx softball color palette.
- Dramatic stadium lighting, depth, atmosphere, energy, and realistic softball texture.
- High-end social media matchup graphic style for Lynx vs ${opponent}.
- Context hints: ${place}, ${field}, ${time}, ${themeIdea}.

Output should look like a finished designer background, not clip art, pixel art, or a flat vector illustration.
`
}

function buildPrompt(toolType, formData) {
  const promptBuilder = toolPrompts[toolType]

  if (!promptBuilder) {
    return null
  }

  return promptBuilder(formData)
}

app.get('/api/health', (_request, response) => {
  response.json({ ok: true })
})

app.post('/api/auth/admin-login', (request, response) => {
  const { email = '', password = '' } = request.body ?? {}
  const normalizedEmail = String(email).trim().toLowerCase()

  if (!adminEmail || !adminPassword) {
    return response.status(500).json({ error: 'ADMIN_EMAIL and ADMIN_PASSWORD are not configured.' })
  }

  if (normalizedEmail !== adminEmail || password !== adminPassword) {
    return response.status(401).json({ error: 'Invalid admin login.' })
  }

  const token = signToken({
    email: normalizedEmail,
    role: 'admin',
    expiresAt: Date.now() + 1000 * 60 * 60 * 12,
  })

  response.json({ token, admin: { email: normalizedEmail, role: 'admin' } })
})

app.post('/api/auth/login', async (request, response) => {
  const { email = '', password = '' } = request.body ?? {}
  const normalizedEmail = String(email).trim().toLowerCase()
  const directory = await readDirectory()
  const profile = directory.profiles.find((candidate) => candidate.email?.toLowerCase() === normalizedEmail)

  if (!profile || !verifyPassword(password, profile.passwordHash)) {
    return response.status(401).json({ error: 'Invalid email or password.' })
  }

  const token = signToken({
    email: normalizedEmail,
    role: profile.role,
    profileId: profile.id,
    expiresAt: Date.now() + 1000 * 60 * 60 * 12,
  })

  response.json({ token, profile: sanitizeProfile(profile) })
})

app.get('/api/auth/me', (request, response) => {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
  const payload = verifyToken(token)

  if (!payload) {
    return response.status(401).json({ error: 'Not logged in.' })
  }

  response.json({ user: { email: payload.email, role: payload.role } })
})

app.get('/api/admin/directory', requireAdmin, async (_request, response) => {
  const directory = await readDirectory()
  response.json({
    invites: directory.invites.map(sanitizeInvite),
    profiles: directory.profiles.map(sanitizeProfile),
  })
})

app.post('/api/admin/invites', requireAdmin, async (request, response) => {
  const { email, role, division = '', team = '' } = request.body ?? {}

  if (!email || !profileRoles.includes(role)) {
    return response.status(400).json({ error: 'Invite requires an email and a parent, coach, or admin role.' })
  }

  const directory = await readDirectory()
  const invite = {
    id: randomUUID(),
    token: randomUUID(),
    email: String(email).trim().toLowerCase(),
    role,
    division,
    team,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }

  directory.invites.unshift(invite)
  await writeDirectory(directory)

  response.json({
    invite: sanitizeInvite(invite),
    inviteLink: `${clientOrigin}/?invite=${invite.token}`,
  })
})

app.get('/api/invites/:token', async (request, response) => {
  const directory = await readDirectory()
  const invite = directory.invites.find((candidate) => candidate.token === request.params.token)

  if (!invite) {
    return response.status(404).json({ error: 'Invite was not found.' })
  }

  if (invite.status === 'accepted') {
    return response.status(409).json({ error: 'Invite has already been accepted.' })
  }

  response.json({ invite: sanitizeInvite(invite) })
})

app.patch('/api/admin/profiles/:profileId/role', requireAdmin, async (request, response) => {
  const { role } = request.body ?? {}

  if (!profileRoles.includes(role)) {
    return response.status(400).json({ error: 'Role must be parent, coach, or admin.' })
  }

  const directory = await readDirectory()
  const profile = directory.profiles.find((candidate) => candidate.id === request.params.profileId)

  if (!profile) {
    return response.status(404).json({ error: 'Profile was not found.' })
  }

  profile.role = role
  profile.updatedAt = new Date().toISOString()
  await writeDirectory(directory)

  response.json({ profile: sanitizeProfile(profile) })
})

app.post('/api/register', async (request, response) => {
  const { token, profile = {}, waiver = {} } = request.body ?? {}
  const directory = await readDirectory()
  const invite = directory.invites.find((candidate) => candidate.token === token)

  if (!invite) {
    return response.status(404).json({ error: 'Invite was not found.' })
  }

  if (invite.status === 'accepted') {
    return response.status(409).json({ error: 'Invite has already been accepted.' })
  }

  if (!profile.firstName || !profile.lastName || !profile.email || !profile.password || !waiver.accepted || !waiver.legalName) {
    return response.status(400).json({ error: 'Complete required profile fields, password, and waiver acknowledgement.' })
  }

  if (String(profile.password).length < 8) {
    return response.status(400).json({ error: 'Password must be at least 8 characters.' })
  }

  const savedProfile = {
    id: randomUUID(),
    inviteId: invite.id,
    role: invite.role,
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    passwordHash: hashPassword(profile.password),
    phone: profile.phone ?? '',
    secondaryEmail: invite.role === 'parent' ? profile.secondaryEmail ?? '' : '',
    secondaryPhone: invite.role === 'parent' ? profile.secondaryPhone ?? '' : '',
    division: profile.division || invite.division || '',
    team: profile.team || invite.team || '',
    athleteName: invite.role === 'parent' ? profile.athleteName ?? '' : '',
    emergencyContact: invite.role === 'parent' ? profile.emergencyContact ?? '' : '',
    emergencyPhone: invite.role === 'parent' ? profile.emergencyPhone ?? '' : '',
    coachTitle: ['coach', 'admin'].includes(invite.role) ? profile.coachTitle ?? '' : '',
    waiver: {
      accepted: true,
      legalName: waiver.legalName,
      version: waiver.version ?? 'lynx-waiver-v1',
      text: waiver.text ?? '',
      acceptedAt: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
  }

  invite.status = 'accepted'
  invite.acceptedAt = new Date().toISOString()
  directory.profiles.unshift(savedProfile)
  await writeDirectory(directory)

  response.json({ profile: sanitizeProfile(savedProfile) })
})

app.post('/api/generate', async (request, response) => {
  const { toolType, formData = {} } = request.body ?? {}
  const prompt = buildPrompt(toolType, formData)

  if (!prompt) {
    return response.status(400).json({ error: 'Unknown toolType.' })
  }

  if (!hasConfiguredApiKey()) {
    return response.status(500).json({ error: 'OPENAI_API_KEY is not configured.' })
  }

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You generate practical youth softball operations content. Be concise, polished, respectful, and ready for a coach to review.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    })

    const text = completion.choices[0]?.message?.content?.trim()

    if (!text) {
      return response.status(502).json({ error: 'No generated text returned.' })
    }

    return response.json({ text })
  } catch (error) {
    const status = error.status ?? 500
    const message = error.error?.message ?? error.message ?? 'Unknown OpenAI API error.'

    console.error('OpenAI generation failed:', {
      status,
      code: error.code,
      type: error.type,
      message,
    })

    return response.status(500).json({
      error:
        process.env.NODE_ENV === 'production'
          ? 'AI generation failed. Check the server logs and API key configuration.'
          : `AI generation failed: ${message}`,
    })
  }
})

app.post('/api/game-day-background', async (request, response) => {
  const { formData = {} } = request.body ?? {}

  if (!hasConfiguredApiKey()) {
    return response.status(500).json({ error: 'OPENAI_API_KEY is not configured.' })
  }

  try {
    const result = await openai.images.generate({
      model: process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1.5',
      prompt: buildGameDayBackgroundPrompt(formData),
      size: '1024x1024',
      quality: process.env.OPENAI_IMAGE_QUALITY ?? 'medium',
    })

    const imageBase64 = result.data?.[0]?.b64_json

    if (!imageBase64) {
      return response.status(502).json({ error: 'No image returned from OpenAI.' })
    }

    return response.json({ imageDataUrl: `data:image/png;base64,${imageBase64}` })
  } catch (error) {
    const status = error.status ?? 500
    const message = error.error?.message ?? error.message ?? 'Unknown OpenAI image API error.'

    console.error('OpenAI image generation failed:', {
      status,
      code: error.code,
      type: error.type,
      message,
    })

    return response.status(500).json({
      error:
        process.env.NODE_ENV === 'production'
          ? 'Game day image generation failed.'
          : `Game day image generation failed: ${message}`,
    })
  }
})

app.listen(port, () => {
  console.log(`Lynx Ops AI server running on http://localhost:${port}`)
})
