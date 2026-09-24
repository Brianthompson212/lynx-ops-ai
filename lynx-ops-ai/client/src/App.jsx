import { useEffect, useMemo, useState } from 'react'
import {
  Bell,
  CalendarDays,
  CalendarPlus,
  Clipboard,
  Copy,
  Download,
  Dumbbell,
  ExternalLink,
  LoaderCircle,
  Megaphone,
  MessageCircle,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react'
import {
  clearStoredAdminToken,
  clearStoredUserSession,
  createInvite,
  generateContent,
  generateGameDayBackground,
  getAdminDirectory,
  getInvite,
  getStoredAdminToken,
  getStoredUserSession,
  loginAdmin,
  loginUser,
  registerInvite,
  updateProfileRole,
} from './api'
import { GOOGLE_API_KEY, GOOGLE_CALENDAR_ID, GOOGLE_CLIENT_ID } from './api'
import FlagFootballBoard from './FlagFootballBoard'

const clubLogoPath = '/lynx-logo.png'
const isFileField = (field) => field.type === 'file'
const divisionNames = ['8U', '10U', '12U']
const emptyRoster = divisionNames.reduce((acc, division) => {
  acc[division] = []
  return acc
}, {})
const galleryStorageKey = 'lynx-athletics-gallery'
const maxGalleryPhotos = 12
const subBoardSports = {
  softball: { label: 'Softball', activeLabel: 'On Field', benchLabel: 'Bench' },
  soccer: { label: 'Soccer', activeLabel: 'On Field', benchLabel: 'Bench' },
  flagFootball: { label: 'Flag Football', activeLabel: 'On Field', benchLabel: 'Bench' },
  basketball: { label: 'Basketball', activeLabel: 'On Court', benchLabel: 'Bench' },
}
const soccerPositionGroups = ['Forward', 'Forward/Mid', 'Mid', 'Mid/Defender', 'Defender', 'Goalie']
const sportStatFields = {
  softball: [
    { name: 'battingAverage', label: 'AVG', placeholder: '.333' },
    { name: 'onBasePercentage', label: 'OBP', placeholder: '.425' },
    { name: 'sluggingPercentage', label: 'SLG', placeholder: '.500' },
    { name: 'speedRating', label: 'SPD 1-5', type: 'select' },
  ],
  soccer: [
    { name: 'soccerPositionGroup', label: 'POS', type: 'select', options: soccerPositionGroups },
    { name: 'staminaRating', label: 'STA 1-5', type: 'select' },
    { name: 'speedRating', label: 'SPD 1-5', type: 'select' },
    { name: 'defenseRating', label: 'DEF 1-5', type: 'select' },
    { name: 'offenseRating', label: 'ATT 1-5', type: 'select' },
  ],
  flagFootball: [
    { name: 'speedRating', label: 'SPD 1-5', type: 'select' },
    { name: 'handsRating', label: 'HND 1-5', type: 'select' },
    { name: 'defenseRating', label: 'DEF 1-5', type: 'select' },
    { name: 'qbRating', label: 'QB 1-5', type: 'select' },
  ],
  basketball: [
    { name: 'staminaRating', label: 'STA 1-5', type: 'select' },
    { name: 'ballHandlingRating', label: 'BALL 1-5', type: 'select' },
    { name: 'shootingRating', label: 'SHOT 1-5', type: 'select' },
    { name: 'defenseRating', label: 'DEF 1-5', type: 'select' },
  ],
}
const softballPositions = [
  { id: 'P', label: 'P', x: 50, y: 55 },
  { id: 'C', label: 'C', x: 50, y: 86 },
  { id: '1B', label: '1B', x: 76, y: 58 },
  { id: '2B', label: '2B', x: 64, y: 38 },
  { id: 'SS', label: 'SS', x: 36, y: 38 },
  { id: '3B', label: '3B', x: 24, y: 58 },
  { id: 'LF', label: 'LF', x: 22, y: 18 },
  { id: 'CF', label: 'CF', x: 50, y: 10 },
  { id: 'RF', label: 'RF', x: 78, y: 18 },
]
const initialScheduleForm = {
  eventType: 'Practice',
  division: divisionNames[0],
  title: '',
  date: '',
  startTime: '',
  endTime: '',
  location: '',
  field: '',
  baselineSide: 'not sure / omit',
  notes: '',
  reminderTiming: '24 hours before',
  repeatCount: '1',
  noticeType: 'Reminder',
  noticeDetails: '',
}
const waiverText = `I understand that participation in Lynx Athletics activities includes inherent risks. I confirm that the information provided is accurate, I authorize emergency contact if needed, and I agree to follow club, team, and facility rules. I understand this acknowledgement should be reviewed by Lynx Athletics leadership and legal counsel before being used as a final legal waiver.`
const initialInviteForm = {
  email: '',
  role: 'parent',
  division: divisionNames[0],
  team: 'Team 1',
}
const initialAdminLoginForm = {
  email: '',
  password: '',
}
const initialRegistrationForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  secondaryEmail: '',
  secondaryPhone: '',
  division: divisionNames[0],
  team: 'Team 1',
  athleteName: '',
  emergencyContact: '',
  emergencyPhone: '',
  coachTitle: '',
  legalName: '',
  waiverAccepted: false,
}
const initialUserLoginForm = {
  email: '',
  password: '',
}

const tools = [
  {
    id: 'parent-message',
    name: 'Parent Message Generator',
    description: 'Create clear parent-ready reminders, updates, and team notes.',
    icon: Megaphone,
    fields: [
      { name: 'messageType', label: 'Message type', placeholder: 'Practice reminder, schedule update, tournament note' },
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'time', label: 'Arrival / start time', type: 'time' },
      { name: 'location', label: 'Location', placeholder: 'Sports complex or school name' },
      { name: 'fieldName', label: 'Field name', placeholder: 'Field 4' },
      { name: 'baselineSide', label: 'Baseline side', type: 'select', options: ['3rd baseline side', '1st baseline side', 'not sure / omit'] },
      { name: 'keyNotes', label: 'Key notes', type: 'textarea', placeholder: 'Final game before postseason. Opponent is Lions. Welcome them to the jungle.' },
      { name: 'tone', label: 'Tone', type: 'select', options: ['professional', 'hype', 'short', 'friendly'] },
    ],
  },
  {
    id: 'practice-plan',
    name: 'Practice Plan Builder',
    description: 'Build organized practices with stations, coaching points, and competition.',
    icon: Dumbbell,
    fields: [
      { name: 'practiceDate', label: 'Practice date', type: 'date' },
      { name: 'ageGroup', label: 'Age group', placeholder: '10U, 12U, 14U' },
      { name: 'practiceStartTime', label: 'Start time', type: 'time' },
      { name: 'practiceEndTime', label: 'End time', type: 'time' },
      { name: 'numberOfPlayers', label: 'Number of players', type: 'number', placeholder: '12' },
      { name: 'focusAreas', label: 'Focus areas', type: 'textarea', placeholder: 'Throwing mechanics, baserunning, infield communication' },
      { name: 'equipmentAvailable', label: 'Equipment available', type: 'textarea', placeholder: 'Buckets, tees, nets, cones, whiffle balls' },
      { name: 'fieldSpaceAvailable', label: 'Field space available', placeholder: 'Full field, half field, cages only' },
      { name: 'endWithCompetition', label: 'End with competition', type: 'select', options: ['yes', 'no'] },
    ],
  },
  {
    id: 'game-day-post',
    name: 'Game Day Post Generator',
    description: 'Draft parent reminders, Instagram captions, and short hype posts.',
    icon: Trophy,
    fields: [
      { name: 'opponent', label: 'Opponent', placeholder: 'Valley Heat' },
      { name: 'arrivalTime', label: 'Arrival time', type: 'time' },
      { name: 'gameTime', label: 'Game time', type: 'time' },
      { name: 'placeName', label: 'Place name', placeholder: 'Rainbow Fields' },
      { name: 'field', label: 'Field', placeholder: 'Lynx Field 2' },
      { name: 'uniformNotes', label: 'Uniform notes', placeholder: 'Purple jersey, gold socks' },
      { name: 'themeOrPunIdea', label: 'Theme or pun idea', placeholder: 'Friday night lights, claw mode' },
      { name: 'graphicTheme', label: 'Graphic theme', type: 'select', options: ['storm night', 'stadium lights', 'gold rush', 'rivalry hype'] },
      { name: 'tone', label: 'Tone', type: 'select', options: ['professional', 'hype', 'short', 'friendly'] },
      { name: 'opponentLogo', label: 'Opponent logo', type: 'file', accept: 'image/png,image/jpeg,image/webp,image/svg+xml' },
    ],
  },
  {
    id: 'lineup-builder',
    name: 'Batting Lineup Builder',
    description: 'Save division rosters, mark available players, and build a copy-ready batting order.',
    icon: Users,
    fields: [],
  },
  {
    id: 'roster-manager',
    name: 'Roster Manager',
    description: 'Build saved rosters by sport, division, and team for every coach module.',
    icon: Users,
    fields: [],
  },
  {
    id: 'schedule-assistant',
    name: 'Schedule Assistant',
    description: 'Save events, add them to calendars, and prep parent reminders for coach review.',
    icon: CalendarPlus,
    fields: [],
  },
  {
    id: 'sub-board',
    name: 'Sub Board',
    description: 'Track who is in, who is sitting, and live sub timing across multiple sports.',
    icon: Users,
    fields: [],
  },
]

const initialFormData = tools.reduce((acc, tool) => {
  acc[tool.id] = tool.fields.reduce((fields, field) => {
    fields[field.name] = isFileField(field) ? null : field.type === 'select' ? field.options[0] : ''
    return fields
  }, {})
  return acc
}, {})

function fileToObjectUrl(file) {
  return file ? URL.createObjectURL(file) : null
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

function formatTimeForDisplay(timeValue) {
  if (!timeValue) return ''
  const [hourValue, minuteValue] = timeValue.split(':')
  const hour = Number(hourValue)
  const minute = Number(minuteValue)

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return timeValue
  }

  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`
}

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function getSubTimerTone(totalSeconds) {
  if (totalSeconds >= 7 * 60) return 'danger'
  if (totalSeconds >= 5 * 60) return 'warning'
  return 'fresh'
}

function getSubPlayerTone(player) {
  if (player.status === 'bench' && (player.benchRestSeconds ?? 0) >= 60) return 'fresh'
  return getSubTimerTone(player.alertSeconds ?? player.fieldSeconds ?? 0)
}

function formatDateForDisplay(dateValue) {
  if (!dateValue) return ''
  const [year, month, day] = dateValue.split('-').map(Number)
  if (!year || !month || !day) return dateValue
  return `${month}/${day}/${year}`
}

function buildDateTime(dateValue, timeValue) {
  if (!dateValue || !timeValue) return null
  return new Date(`${dateValue}T${timeValue}:00`)
}

function formatCalendarDate(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function addDaysToDateString(dateValue, days) {
  const [year, month, day] = dateValue.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  const nextYear = date.getFullYear()
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0')
  const nextDay = String(date.getDate()).padStart(2, '0')
  return `${nextYear}-${nextMonth}-${nextDay}`
}

function downloadTextFile(filename, content, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function compressImageFile(file, maxWidth = 1400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const image = new Image()
      image.onload = () => {
        const scale = Math.min(1, maxWidth / image.width)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(image.width * scale)
        canvas.height = Math.round(image.height * scale)
        const context = canvas.getContext('2d')
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      image.onerror = reject
      image.src = reader.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${src}"]`)
    if (existingScript) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.defer = true
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

function getMonthDays(activeDate) {
  const year = activeDate.getFullYear()
  const month = activeDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const startDate = new Date(firstDay)
  startDate.setDate(firstDay.getDate() - firstDay.getDay())

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(startDate)
    day.setDate(startDate.getDate() + index)
    return day
  })
}

function getDateKey(date) {
  return date.toISOString().slice(0, 10)
}

function drawCoverImage(context, image, x, y, width, height) {
  const scale = Math.min(width / image.width, height / image.height)
  const renderWidth = image.width * scale
  const renderHeight = image.height * scale
  context.drawImage(
    image,
    x + (width - renderWidth) / 2,
    y + (height - renderHeight) / 2,
    renderWidth,
    renderHeight,
  )
}

function removeDarkLogoBackground(image) {
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const context = canvas.getContext('2d')
  context.drawImage(image, 0, 0)

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  const pixels = imageData.data

  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index]
    const green = pixels[index + 1]
    const blue = pixels[index + 2]
    const brightness = (red + green + blue) / 3
    const isNearBlack = brightness < 34
    const isDarkNeutral = brightness < 54 && Math.abs(red - green) < 18 && Math.abs(green - blue) < 18

    if (isNearBlack || isDarkNeutral) {
      pixels[index + 3] = 0
    }
  }

  context.putImageData(imageData, 0, 0)
  return canvas
}

function drawLightning(context, startX, startY, endX, endY, color) {
  const segments = 12
  const points = [{ x: startX, y: startY }]

  for (let index = 1; index < segments; index += 1) {
    const progress = index / segments
    points.push({
      x: startX + (endX - startX) * progress + (Math.random() - 0.5) * 54,
      y: startY + (endY - startY) * progress + (Math.random() - 0.5) * 42,
    })
  }

  points.push({ x: endX, y: endY })

  context.save()
  context.shadowBlur = 22
  context.shadowColor = color
  context.strokeStyle = color
  context.lineWidth = 5
  context.beginPath()
  points.forEach((point, index) => {
    if (index === 0) {
      context.moveTo(point.x, point.y)
    } else {
      context.lineTo(point.x, point.y)
    }
  })
  context.stroke()

  context.strokeStyle = 'rgba(255, 255, 255, 0.86)'
  context.lineWidth = 1.4
  context.stroke()
  context.restore()
}

function drawStadiumLight(context, x, y, angle) {
  context.save()
  context.translate(x, y)
  context.rotate(angle)
  context.fillStyle = 'rgba(255, 224, 138, 0.95)'
  context.shadowBlur = 28
  context.shadowColor = '#ffe08a'
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      context.beginPath()
      context.arc(col * 17, row * 17, 5, 0, Math.PI * 2)
      context.fill()
    }
  }
  context.restore()
}

function drawSoftball(context) {
  context.save()
  const ballGradient = context.createRadialGradient(470, 1010, 90, 540, 1245, 560)
  ballGradient.addColorStop(0, '#fff8b9')
  ballGradient.addColorStop(0.28, '#ecd15f')
  ballGradient.addColorStop(0.7, '#c5902e')
  ballGradient.addColorStop(1, '#5b3613')
  context.fillStyle = ballGradient
  context.beginPath()
  context.ellipse(540, 1218, 555, 364, 0, Math.PI, Math.PI * 2)
  context.fill()

  const shadowGradient = context.createLinearGradient(0, 870, 0, 1080)
  shadowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.12)')
  shadowGradient.addColorStop(0.55, 'rgba(0, 0, 0, 0)')
  shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0.42)')
  context.fillStyle = shadowGradient
  context.beginPath()
  context.ellipse(540, 1218, 555, 364, 0, Math.PI, Math.PI * 2)
  context.fill()

  context.globalAlpha = 0.16
  for (let index = 0; index < 900; index += 1) {
    const x = 20 + Math.random() * 1040
    const y = 880 + Math.random() * 200
    const dx = (x - 540) / 555
    const dy = (y - 1218) / 364
    if (dx * dx + dy * dy <= 1) {
      context.fillStyle = Math.random() > 0.5 ? '#fff5af' : '#593215'
      context.fillRect(x, y, Math.random() * 2.4 + 0.4, Math.random() * 2.4 + 0.4)
    }
  }
  context.globalAlpha = 1

  function drawSeam(centerX, radiusX, startAngle, endAngle, flip = 1) {
    context.strokeStyle = 'rgba(119, 22, 20, 0.92)'
    context.lineWidth = 9
    context.shadowBlur = 8
    context.shadowColor = 'rgba(86, 14, 12, 0.58)'
    context.beginPath()
    context.arc(centerX, 1248, radiusX, startAngle, endAngle)
    context.stroke()
    context.shadowBlur = 0

    context.strokeStyle = 'rgba(75, 16, 14, 0.92)'
    context.lineWidth = 5
    for (let index = 0; index < 13; index += 1) {
      const angle = startAngle + ((endAngle - startAngle) * index) / 12
      const x = centerX + Math.cos(angle) * radiusX
      const y = 1248 + Math.sin(angle) * radiusX
      context.beginPath()
      context.moveTo(x - 18 * flip, y - 10)
      context.lineTo(x + 18 * flip, y + 14)
      context.stroke()
    }
  }

  drawSeam(310, 375, -2.2, -0.92, 1)
  drawSeam(770, 375, -2.22, -0.94, -1)
  context.restore()
}

function drawTitleText(context, text, x, y) {
  context.save()
  context.textAlign = 'center'
  context.font = '900 138px Arial Black, Impact, Arial'
  context.lineJoin = 'round'
  context.shadowColor = 'rgba(0, 0, 0, 0.65)'
  context.shadowBlur = 18
  context.shadowOffsetY = 12
  context.strokeStyle = '#6d2a12'
  context.lineWidth = 24
  context.strokeText(text, x, y)
  context.strokeStyle = '#f5bd38'
  context.lineWidth = 10
  context.strokeText(text, x, y)

  const titleGradient = context.createLinearGradient(0, y - 120, 0, y + 20)
  titleGradient.addColorStop(0, '#ffffff')
  titleGradient.addColorStop(0.45, '#fff3c2')
  titleGradient.addColorStop(1, '#b6762a')
  context.fillStyle = titleGradient
  context.fillText(text, x, y)
  context.restore()
}

function drawLogoSpot(context, image, x, y, size, fallbackText) {
  context.save()
  context.shadowBlur = 24
  context.shadowColor = 'rgba(0, 0, 0, 0.72)'
  if (image) {
    drawCoverImage(context, image, x, y, size, size)
  } else {
    context.fillStyle = '#f5bd38'
    context.font = '900 56px Arial Black, Arial'
    context.textAlign = 'center'
    context.fillText(fallbackText, x + size / 2, y + size / 2 + 18)
  }
  context.restore()
}

async function createGameDayGraphic(formData) {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1080
  const context = canvas.getContext('2d')
  const opponentLogoUrl = fileToObjectUrl(formData.opponentLogo)
  const [lynxLogo, opponentLogo] = await Promise.all([
    loadImage(clubLogoPath),
    opponentLogoUrl ? loadImage(opponentLogoUrl).catch(() => null) : Promise.resolve(null),
  ])
  const cleanedOpponentLogo = opponentLogo ? removeDarkLogoBackground(opponentLogo) : null

  if (opponentLogoUrl) {
    URL.revokeObjectURL(opponentLogoUrl)
  }

  let aiBackground = null

  try {
    const backgroundDataUrl = await generateGameDayBackground({
      field: formData.field,
      gameTime: formData.gameTime,
      opponent: formData.opponent,
      placeName: formData.placeName,
      themeOrPunIdea: formData.themeOrPunIdea,
      graphicTheme: formData.graphicTheme,
    })
    aiBackground = await loadImage(backgroundDataUrl)
  } catch {
    aiBackground = null
  }

  const usedAiBackground = Boolean(aiBackground)

  if (usedAiBackground) {
    drawCoverImage(context, aiBackground, 0, 0, 1080, 1080)
  } else {
    context.fillStyle = '#11051f'
    context.fillRect(0, 0, canvas.width, canvas.height)

    const backgroundGradient = context.createRadialGradient(540, 290, 40, 540, 520, 830)
    backgroundGradient.addColorStop(0, '#5f2c91')
    backgroundGradient.addColorStop(0.45, '#281150')
    backgroundGradient.addColorStop(1, '#090313')
    context.fillStyle = backgroundGradient
    context.fillRect(0, 0, canvas.width, canvas.height)

    drawLightning(context, -40, 180, 1120, 110, 'rgba(210, 111, 255, 0.95)')
    drawLightning(context, 40, 345, 1020, 342, 'rgba(255, 145, 42, 0.86)')
    drawLightning(context, -20, 515, 1120, 430, 'rgba(180, 84, 255, 0.82)')
    drawSoftball(context)
  }

  const vignette = context.createRadialGradient(540, 520, 230, 540, 540, 760)
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
  vignette.addColorStop(0.65, 'rgba(0, 0, 0, 0.18)')
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.66)')
  context.fillStyle = vignette
  context.fillRect(0, 0, 1080, 1080)

  drawTitleText(context, 'GAME DAY', 540, 170)

  const matchupBand = context.createLinearGradient(72, 340, 1008, 340)
  matchupBand.addColorStop(0, 'rgba(9, 3, 19, 0)')
  matchupBand.addColorStop(0.22, 'rgba(9, 3, 19, 0.5)')
  matchupBand.addColorStop(0.5, 'rgba(9, 3, 19, 0.72)')
  matchupBand.addColorStop(0.78, 'rgba(9, 3, 19, 0.5)')
  matchupBand.addColorStop(1, 'rgba(9, 3, 19, 0)')
  context.fillStyle = matchupBand
  context.fillRect(10, 332, 1060, 246)
  context.fillStyle = 'rgba(245, 189, 56, 0.2)'
  context.fillRect(124, 576, 832, 3)

  drawLogoSpot(context, lynxLogo, 92, 330, 300, 'LYNX')
  drawLogoSpot(context, cleanedOpponentLogo, 686, 344, 270, 'OPP')

  context.textAlign = 'center'
  context.fillStyle = '#ffffff'
  context.font = '900 78px Arial Black, Arial'
  context.shadowColor = 'rgba(0, 0, 0, 0.7)'
  context.shadowBlur = 14
  context.fillText('VS', 540, 475)
  context.shadowBlur = 0

  context.fillStyle = '#f5bd38'
  context.font = '900 44px Arial Black, Arial'
  context.fillText('LYNX', 250, 674)
  context.fillText((formData.opponent || 'OPPONENT').toUpperCase(), 820, 674)

  context.fillStyle = '#ffffff'
  context.font = '900 70px Arial Black, Arial'
  context.fillText(formatTimeForDisplay(formData.gameTime) || 'GAME TIME TBD', 540, 750)

  context.font = '900 42px Arial Black, Arial'
  context.fillText((formData.placeName || 'PLACE TBD').toUpperCase(), 540, 812)

  context.fillStyle = 'rgba(255, 255, 255, 0.82)'
  context.font = '900 34px Arial Black, Arial'
  context.fillText((formData.field || 'FIELD TBD').toUpperCase(), 540, 862)

  if (!usedAiBackground) {
    drawStadiumLight(context, 74, 712, -0.25)
    drawStadiumLight(context, 884, 716, 0.2)
  }

  return { dataUrl: canvas.toDataURL('image/png'), usedAiBackground }
}

function FieldControl({ field, value, onChange }) {
  if (field.type === 'file') {
    return (
      <input
        accept={field.accept}
        id={field.name}
        name={field.name}
        onChange={(event) => onChange(field.name, event.target.files?.[0] ?? null)}
        type="file"
      />
    )
  }

  const commonProps = {
    id: field.name,
    name: field.name,
    value,
    onChange: (event) => onChange(field.name, event.target.value),
    placeholder: field.placeholder,
  }

  if (field.type === 'textarea') {
    return <textarea {...commonProps} rows="4" />
  }

  if (field.type === 'select') {
    return (
      <select {...commonProps}>
        {field.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    )
  }

  return <input {...commonProps} type={field.type ?? 'text'} />
}

function StatInput({ field, player, onUpdate, idPrefix }) {
  const id = `${idPrefix}-${field.name}-${player.id}`

  if (field.type === 'select') {
    const options = field.options ?? ['1', '2', '3', '4', '5']
    const fallbackValue = options.includes(player[field.name]) ? player[field.name] : options[0]

    return (
      <label htmlFor={id}>
        <span>{field.label}</span>
        <select id={id} value={fallbackValue} onChange={(event) => onUpdate(player.id, field.name, event.target.value)}>
          {options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
    )
  }

  return (
    <label htmlFor={id}>
      <span>{field.label}</span>
      <input
        id={id}
        inputMode="decimal"
        placeholder={field.placeholder}
        value={player[field.name] ?? ''}
        onChange={(event) => onUpdate(player.id, field.name, event.target.value)}
      />
    </label>
  )
}

function App() {
  const [selectedToolId, setSelectedToolId] = useState(tools[0].id)
  const [currentPortal, setCurrentPortal] = useState('public')
  const [coachSection, setCoachSection] = useState('tools')
  const [coachRole, setCoachRole] = useState('admin')
  const [subBoardSport, setSubBoardSport] = useState('soccer')
  const [subBoardPlayerName, setSubBoardPlayerName] = useState('')
  const [subBoardRunning, setSubBoardRunning] = useState(false)
  const [subBoardClockSeconds, setSubBoardClockSeconds] = useState(0)
  const [subBoardPlayers, setSubBoardPlayers] = useState([])
  const [soccerScore, setSoccerScore] = useState({ lynx: 0, opponent: 0 })
  const [soccerGoals, setSoccerGoals] = useState([])
  const [isGoalPromptOpen, setIsGoalPromptOpen] = useState(false)
  const [goalForm, setGoalForm] = useState({ team: 'lynx', scorerId: '', assistId: '' })
  const [formData, setFormData] = useState(initialFormData)
  const [rosters, setRosters] = useState(() => {
    try {
      return { ...emptyRoster, ...JSON.parse(localStorage.getItem('lynx-rosters') ?? '{}') }
    } catch {
      return emptyRoster
    }
  })
  const [selectedDivision, setSelectedDivision] = useState(divisionNames[0])
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newPlayerNumber, setNewPlayerNumber] = useState('')
  const [selectedRosterSport, setSelectedRosterSport] = useState('softball')
  const [selectedTeamName, setSelectedTeamName] = useState('Team 1')
  const [lineupGameLabel, setLineupGameLabel] = useState('')
  const [availablePlayers, setAvailablePlayers] = useState({})
  const [lineupStyle, setLineupStyle] = useState('performance')
  const [scheduleForm, setScheduleForm] = useState(initialScheduleForm)
  const [editingScheduleEventId, setEditingScheduleEventId] = useState('')
  const [selectedNoticeEventId, setSelectedNoticeEventId] = useState('')
  const [scheduleEvents, setScheduleEvents] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('lynx-schedule-events') ?? '[]')
    } catch {
      return []
    }
  })
  const [calendarDate, setCalendarDate] = useState(() => new Date())
  const [googleAccessToken, setGoogleAccessToken] = useState('')
  const [googleEvents, setGoogleEvents] = useState([])
  const [googleStatus, setGoogleStatus] = useState('')
  const [googleTokenClient, setGoogleTokenClient] = useState(null)
  const [galleryPhotos, setGalleryPhotos] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(galleryStorageKey) ?? '[]')
    } catch {
      return []
    }
  })
  const [galleryCaption, setGalleryCaption] = useState('')
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0)
  const [isGalleryPlaying, setIsGalleryPlaying] = useState(true)
  const [parentMessage, setParentMessage] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copyLabel, setCopyLabel] = useState('Copy')
  const [noticeCopyLabel, setNoticeCopyLabel] = useState('Copy Notice')
  const [socialGraphicUrl, setSocialGraphicUrl] = useState('')
  const [graphicError, setGraphicError] = useState('')
  const [inviteForm, setInviteForm] = useState(initialInviteForm)
  const [inviteLink, setInviteLink] = useState('')
  const [directory, setDirectory] = useState({ invites: [], profiles: [] })
  const [directoryError, setDirectoryError] = useState('')
  const [directoryStatus, setDirectoryStatus] = useState('')
  const [adminToken, setAdminToken] = useState(() => getStoredAdminToken())
  const [adminLoginForm, setAdminLoginForm] = useState(initialAdminLoginForm)
  const [adminLoginError, setAdminLoginError] = useState('')
  const [inviteToken] = useState(() => new URLSearchParams(window.location.search).get('invite') ?? '')
  const [activeInvite, setActiveInvite] = useState(null)
  const [registrationForm, setRegistrationForm] = useState(initialRegistrationForm)
  const [registrationStatus, setRegistrationStatus] = useState('')
  const [registrationError, setRegistrationError] = useState('')
  const [userSession, setUserSession] = useState(() => getStoredUserSession())
  const [userLoginForm, setUserLoginForm] = useState(initialUserLoginForm)
  const [userLoginRole, setUserLoginRole] = useState('parent')
  const [userLoginError, setUserLoginError] = useState('')

  const selectedTool = useMemo(
    () => tools.find((tool) => tool.id === selectedToolId),
    [selectedToolId],
  )

  const selectedToolData = formData[selectedToolId]
  const isPracticePlan = selectedToolId === 'practice-plan'
  const isGameDayPost = selectedToolId === 'game-day-post'
  const isLineupBuilder = selectedToolId === 'lineup-builder'
  const isScheduleAssistant = selectedToolId === 'schedule-assistant'
  const isSubBoard = selectedToolId === 'sub-board'
  const isRosterManager = selectedToolId === 'roster-manager'
  const selectedRosterKey = `${selectedRosterSport}:${selectedDivision}:${selectedTeamName.trim() || 'Team 1'}`
  const selectedRoster = useMemo(() => rosters[selectedRosterKey] ?? [], [rosters, selectedRosterKey])
  const sortedScheduleEvents = useMemo(
    () =>
      [...scheduleEvents].sort((a, b) => {
        const first = `${a.date || '9999-12-31'}T${a.startTime || '23:59'}`
        const second = `${b.date || '9999-12-31'}T${b.startTime || '23:59'}`
        return first.localeCompare(second)
      }),
    [scheduleEvents],
  )
  useEffect(() => {
    localStorage.setItem('lynx-rosters', JSON.stringify(rosters))
  }, [rosters])

  useEffect(() => {
    localStorage.setItem('lynx-schedule-events', JSON.stringify(scheduleEvents))
  }, [scheduleEvents])

  useEffect(() => {
    localStorage.setItem(galleryStorageKey, JSON.stringify(galleryPhotos))
  }, [galleryPhotos])

  useEffect(() => {
    if (!inviteToken) return

    let isMounted = true
    setCurrentPortal('register')
    setRegistrationError('')
    getInvite(inviteToken)
      .then((invite) => {
        if (!isMounted) return
        setActiveInvite(invite)
        setRegistrationForm((current) => ({
          ...current,
          email: invite.email,
          division: invite.division || current.division,
          team: invite.team || current.team,
        }))
      })
      .catch((inviteError) => {
        if (!isMounted) return
        setRegistrationError(inviteError.message)
      })

    return () => {
      isMounted = false
    }
  }, [inviteToken])

  const availableTeamNames = useMemo(() => {
    const prefix = `${selectedRosterSport}:${selectedDivision}:`
    const teams = Object.keys(rosters)
      .filter((key) => key.startsWith(prefix))
      .map((key) => key.slice(prefix.length))
      .filter(Boolean)

    return [...new Set(teams.length ? teams : [selectedTeamName || 'Team 1'])]
  }, [rosters, selectedDivision, selectedRosterSport, selectedTeamName])

  useEffect(() => {
    if (!subBoardRunning) return undefined
    let lastTick = Date.now()

    const timer = window.setInterval(() => {
      const now = Date.now()
      const elapsedSeconds = Math.floor((now - lastTick) / 1000)

      if (elapsedSeconds < 1) return

      lastTick += elapsedSeconds * 1000
      setSubBoardClockSeconds((current) => current + elapsedSeconds)
      setSubBoardPlayers((current) =>
        current.map((player) => ({
          ...player,
          fieldSeconds: player.status === 'active' ? player.fieldSeconds + elapsedSeconds : player.fieldSeconds,
          benchSeconds: player.status === 'bench' ? player.benchSeconds + elapsedSeconds : player.benchSeconds,
          alertSeconds: player.status === 'active'
            ? (player.alertSeconds ?? player.fieldSeconds ?? 0) + elapsedSeconds
            : (player.benchRestSeconds ?? 0) + elapsedSeconds >= 60
              ? 0
              : (player.alertSeconds ?? player.fieldSeconds ?? 0),
          benchRestSeconds: player.status === 'bench' ? (player.benchRestSeconds ?? 0) + elapsedSeconds : 0,
        })),
      )
    }, 250)

    return () => window.clearInterval(timer)
  }, [subBoardRunning])

  useEffect(() => {
    if (availableTeamNames.length && !availableTeamNames.includes(selectedTeamName)) {
      setSelectedTeamName(availableTeamNames[0])
    }
  }, [availableTeamNames, selectedTeamName])

  useEffect(() => {
    if (!isGalleryPlaying || galleryPhotos.length <= 1 || currentPortal !== 'public') return undefined

    const timer = window.setInterval(() => {
      setActiveGalleryIndex((current) => (current + 1) % galleryPhotos.length)
    }, 4500)

    return () => window.clearInterval(timer)
  }, [currentPortal, galleryPhotos.length, isGalleryPlaying])

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_API_KEY || !GOOGLE_CALENDAR_ID) return

    let isMounted = true

    async function initializeGoogleAuth() {
      try {
        await loadScript('https://accounts.google.com/gsi/client')
        if (!isMounted || !window.google?.accounts?.oauth2) return
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/calendar.events',
          callback: (response) => {
            if (response.access_token) {
              setGoogleAccessToken(response.access_token)
              setGoogleStatus('Connected to Google Calendar.')
            }
          },
        })
        setGoogleTokenClient(tokenClient)
      } catch {
        setGoogleStatus('Google Calendar login could not load.')
      }
    }

    initializeGoogleAuth()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const divisionPlayers = selectedRoster
    setAvailablePlayers((current) => {
      const nextAvailability = {}
      divisionPlayers.forEach((player) => {
        nextAvailability[player.id] = current[player.id] ?? true
      })
      return nextAvailability
    })
  }, [selectedRoster])

  const normalizePlayer = (player) => ({
    id: player.id ?? crypto.randomUUID(),
    name: player.name ?? '',
    number: player.number ?? '',
    battingAverage: player.battingAverage ?? '',
    onBasePercentage: player.onBasePercentage ?? '',
    sluggingPercentage: player.sluggingPercentage ?? '',
    speedRating: player.speedRating ?? '3',
    staminaRating: player.staminaRating ?? '3',
    defenseRating: player.defenseRating ?? '3',
    offenseRating: player.offenseRating ?? '3',
    soccerPositionGroup: player.soccerPositionGroup ?? 'Mid',
    handsRating: player.handsRating ?? '3',
    qbRating: player.qbRating ?? '3',
    ballHandlingRating: player.ballHandlingRating ?? '3',
    shootingRating: player.shootingRating ?? '3',
  })

  const parseStat = (value) => {
    const stat = Number(value)
    if (Number.isNaN(stat) || stat <= 0) return 0
    if (stat > 10) return stat / 1000
    if (stat > 1) return stat / 100
    return stat
  }

  const getPlayerTraits = (player) => {
    const battingAverage = parseStat(player.battingAverage)
    const onBasePercentage = parseStat(player.onBasePercentage) || battingAverage
    const sluggingPercentage = parseStat(player.sluggingPercentage) || battingAverage
    const speedRating = Number(player.speedRating) || 3

    return {
      ...player,
      consistency: onBasePercentage * 0.55 + battingAverage * 0.35 + (speedRating / 5) * 0.1,
      power: sluggingPercentage || battingAverage,
      speed: speedRating,
      risk: 1 - (onBasePercentage || battingAverage),
    }
  }

  const sortBy = (players, scoreGetter) => [...players].sort((a, b) => scoreGetter(b) - scoreGetter(a))

  const pullBest = (players, predicate = () => true) => {
    const index = players.findIndex(predicate)
    if (index === -1) return null
    return players.splice(index, 1)[0]
  }

  const hasSlowAheadOfFastIssue = (candidate, lineup) => {
    const previous = lineup[lineup.length - 1]
    return previous && previous.speed <= 2 && candidate.speed >= 4
  }

  const buildSmartLineup = (players) => {
    const ranked = sortBy(players.map(getPlayerTraits), (player) => player.consistency)
    const powerRanked = sortBy(ranked, (player) => player.power)
    const bigBatIds = new Set(powerRanked.slice(0, Math.max(1, Math.ceil(players.length * 0.28))).map((player) => player.id))
    const lineup = []
    const remaining = [...ranked]

    const addPlayer = (player) => {
      if (!player) return
      lineup.push(player)
      const remainingIndex = remaining.findIndex((candidate) => candidate.id === player.id)
      if (remainingIndex !== -1) remaining.splice(remainingIndex, 1)
    }

    addPlayer(
      pullBest(
        remaining,
        (player) => player.speed >= 4 && player.consistency >= ranked[Math.min(3, ranked.length - 1)]?.consistency,
      ) ?? remaining[0],
    )
    addPlayer(pullBest(remaining, (player) => player.consistency >= 0.3 && player.speed >= 3) ?? remaining[0])
    addPlayer(pullBest(remaining, (player) => bigBatIds.has(player.id)) ?? remaining[0])
    addPlayer(pullBest(remaining, (player) => player.consistency >= 0.28 && !bigBatIds.has(player.id)) ?? remaining[0])
    addPlayer(pullBest(remaining, (player) => bigBatIds.has(player.id)) ?? remaining[0])

    while (remaining.length) {
      const lastTwo = lineup.slice(-2)
      const lastTwoRisky = lastTwo.length === 2 && lastTwo.every((player) => player.risk > 0.68)
      const lastWasPower = bigBatIds.has(lineup[lineup.length - 1]?.id)

      const candidate =
        pullBest(
          remaining,
          (player) =>
            !hasSlowAheadOfFastIssue(player, lineup) &&
            !(lastWasPower && bigBatIds.has(player.id)) &&
            !(lastTwoRisky && player.risk > 0.68),
        ) ??
        pullBest(remaining, (player) => !hasSlowAheadOfFastIssue(player, lineup)) ??
        remaining[0]

      addPlayer(candidate)
    }

    const slowBeforeFastIndex = lineup.findIndex((player, index) => {
      const next = lineup[index + 1]
      return next && player.speed <= 2 && next.speed >= 4
    })

    if (slowBeforeFastIndex !== -1 && slowBeforeFastIndex + 2 < lineup.length) {
      const fastPlayer = lineup.splice(slowBeforeFastIndex + 1, 1)[0]
      lineup.splice(Math.max(1, slowBeforeFastIndex - 1), 0, fastPlayer)
    }

    return lineup
  }

  const handleFieldChange = (fieldName, value) => {
    setFormData((current) => ({
      ...current,
      [selectedToolId]: {
        ...current[selectedToolId],
        [fieldName]: value,
      },
    }))
  }

  const loadDirectory = async () => {
    if (!adminToken && !getStoredAdminToken()) return
    setDirectoryError('')
    try {
      setDirectory(await getAdminDirectory())
    } catch (loadError) {
      setDirectoryError(loadError.message)
    }
  }

  const handleAdminLoginChange = (fieldName, value) => {
    setAdminLoginForm((current) => ({ ...current, [fieldName]: value }))
  }

  const handleAdminLogin = async (event) => {
    event.preventDefault()
    setAdminLoginError('')

    try {
      const result = await loginAdmin(adminLoginForm)
      setAdminToken(result.token)
      setAdminLoginForm(initialAdminLoginForm)
      setDirectoryStatus('Admin login successful.')
      await loadDirectory()
    } catch (loginError) {
      setAdminLoginError(loginError.message)
    }
  }

  const handleAdminLogout = () => {
    clearStoredAdminToken()
    setAdminToken('')
    setDirectory({ invites: [], profiles: [] })
    setDirectoryStatus('')
    setDirectoryError('')
  }

  const handleInviteChange = (fieldName, value) => {
    setInviteForm((current) => ({ ...current, [fieldName]: value }))
  }

  const handleCreateInvite = async (event) => {
    event.preventDefault()
    setDirectoryError('')
    setDirectoryStatus('')
    setInviteLink('')

    try {
      const createdInvite = await createInvite(inviteForm)
      setInviteLink(createdInvite.inviteLink)
      setDirectoryStatus('Invite link created. Send it to the parent or coach by email.')
      setInviteForm(initialInviteForm)
      await loadDirectory()
    } catch (inviteError) {
      setDirectoryError(inviteError.message)
    }
  }

  const handleRegistrationChange = (fieldName, value) => {
    setRegistrationForm((current) => ({ ...current, [fieldName]: value }))
  }

  const handleRegistrationSubmit = async (event) => {
    event.preventDefault()
    setRegistrationError('')
    setRegistrationStatus('')

    if (registrationForm.password !== registrationForm.confirmPassword) {
      setRegistrationError('Passwords do not match.')
      return
    }

    try {
      await registerInvite({
        token: inviteToken,
        profile: registrationForm,
        waiver: {
          accepted: registrationForm.waiverAccepted,
          legalName: registrationForm.legalName,
          version: 'lynx-waiver-v1',
          text: waiverText,
        },
      })
      setRegistrationStatus('Profile complete. Your access request is saved with Lynx Athletics.')
      setRegistrationForm(initialRegistrationForm)
    } catch (registerError) {
      setRegistrationError(registerError.message)
    }
  }

  const handleUserLoginChange = (fieldName, value) => {
    setUserLoginForm((current) => ({ ...current, [fieldName]: value }))
  }

  const openUserLogin = (role) => {
    setUserLoginRole(role)
    setCurrentPortal('login')
    setUserLoginError('')
  }

  const handleUserLogin = async (event) => {
    event.preventDefault()
    setUserLoginError('')

    try {
      const result = await loginUser(userLoginForm)
      setUserSession({ token: result.token, profile: result.profile })
      setUserLoginForm(initialUserLoginForm)

      if (result.profile.role === 'parent') {
        setCurrentPortal('parent')
        return
      }

      setCurrentPortal('coach')
      setCoachRole(result.profile.role === 'admin' ? 'admin' : 'coach')
      setCoachSection('tools')
    } catch (loginError) {
      setUserLoginError(loginError.message)
    }
  }

  const handleUserLogout = () => {
    clearStoredUserSession()
    setUserSession({ token: '', profile: null })
    setCurrentPortal('public')
  }

  const handleProfileRoleChange = async (profileId, role) => {
    setDirectoryError('')
    setDirectoryStatus('')

    try {
      await updateProfileRole(profileId, role)
      setDirectoryStatus(`Profile role updated to ${role}.`)
      await loadDirectory()
    } catch (roleError) {
      setDirectoryError(roleError.message)
    }
  }

  const handleToolSelect = (toolId) => {
    setCoachSection('tools')
    setSelectedToolId(toolId)
    setError('')
    setCopyLabel('Copy')
    setSocialGraphicUrl('')
    setGraphicError('')
  }

  const handleAddPlayer = () => {
    const trimmedName = newPlayerName.trim()
    if (!trimmedName) return

    setRosters((current) => ({
      ...current,
      [selectedRosterKey]: [
        ...(current[selectedRosterKey] ?? []),
        {
          id: crypto.randomUUID(),
          name: trimmedName,
          number: newPlayerNumber.trim(),
          battingAverage: '',
          onBasePercentage: '',
          sluggingPercentage: '',
          speedRating: '3',
          staminaRating: '3',
          defenseRating: '3',
          offenseRating: '3',
          soccerPositionGroup: 'Mid',
          handsRating: '3',
          qbRating: '3',
          ballHandlingRating: '3',
          shootingRating: '3',
        },
      ],
    }))
    setNewPlayerName('')
    setNewPlayerNumber('')
  }

  const handleRemovePlayer = (playerId) => {
    setRosters((current) => ({
      ...current,
      [selectedRosterKey]: (current[selectedRosterKey] ?? []).filter((player) => player.id !== playerId),
    }))
  }

  const handleAvailabilityChange = (playerId) => {
    setAvailablePlayers((current) => ({
      ...current,
      [playerId]: !current[playerId],
    }))
  }

  const handlePlayerUpdate = (playerId, fieldName, value) => {
    setRosters((current) => ({
      ...current,
      [selectedRosterKey]: (current[selectedRosterKey] ?? []).map((player) =>
        player.id === playerId ? { ...normalizePlayer(player), [fieldName]: value } : normalizePlayer(player),
      ),
    }))
  }

  const buildEventTitle = (event) => {
    const baseTitle = event.title.trim() || `Lynx ${event.eventType}`
    const divisionPrefix = event.division ? `${event.division} ` : ''
    const titled = baseTitle.toLowerCase().includes('lynx') ? baseTitle : `Lynx ${baseTitle}`
    return titled.includes(event.division) ? titled : `${divisionPrefix}${titled}`
  }

  const buildEventLocation = (event) => [event.location, event.field].filter(Boolean).join(' - ')

  const selectedNoticeEvent = sortedScheduleEvents.find((event) => event.id === selectedNoticeEventId) ?? sortedScheduleEvents[0]
  const scheduleNoticeText = [
    `${scheduleForm.noticeType}: ${selectedNoticeEvent ? buildEventTitle(selectedNoticeEvent) : 'Lynx schedule update'}`,
    '',
    selectedNoticeEvent
      ? `${formatDateForDisplay(selectedNoticeEvent.date)} at ${formatTimeForDisplay(selectedNoticeEvent.startTime)}${selectedNoticeEvent.endTime ? `-${formatTimeForDisplay(selectedNoticeEvent.endTime)}` : ''}`
      : '',
    selectedNoticeEvent && buildEventLocation(selectedNoticeEvent) ? buildEventLocation(selectedNoticeEvent) : '',
    scheduleForm.noticeDetails,
    '',
    'Please review and reply if you have any questions.',
  ].filter(Boolean).join('\n')

  const buildGoogleCalendarUrl = (event) => {
    const start = buildDateTime(event.date, event.startTime)
    const end = buildDateTime(event.date, event.endTime || event.startTime)
    if (!start || !end) return ''

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: buildEventTitle(event),
      dates: `${formatCalendarDate(start)}/${formatCalendarDate(end)}`,
      location: buildEventLocation(event),
      details: [
        event.notes,
        event.baselineSide !== 'not sure / omit' ? `Baseline side: ${event.baselineSide}` : '',
        `Parent reminder: ${event.reminderTiming}`,
      ].filter(Boolean).join('\n'),
    })

    return `https://calendar.google.com/calendar/render?${params.toString()}`
  }

  const downloadIcsEvent = (event) => {
    const start = buildDateTime(event.date, event.startTime)
    const end = buildDateTime(event.date, event.endTime || event.startTime)
    if (!start || !end) return

    const content = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Lynx Ops AI//Schedule Assistant//EN',
      'BEGIN:VEVENT',
      `UID:${event.id}@lynx-ops-ai`,
      `DTSTAMP:${formatCalendarDate(new Date())}`,
      `DTSTART:${formatCalendarDate(start)}`,
      `DTEND:${formatCalendarDate(end)}`,
      `SUMMARY:${buildEventTitle(event)}`,
      `LOCATION:${buildEventLocation(event)}`,
      `DESCRIPTION:${[event.notes, event.baselineSide !== 'not sure / omit' ? `Baseline side: ${event.baselineSide}` : ''].filter(Boolean).join('\\n')}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')

    downloadTextFile(`${buildEventTitle(event).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`, content, 'text/calendar')
  }

  const handleScheduleChange = (fieldName, value) => {
    setScheduleForm((current) => ({ ...current, [fieldName]: value }))
  }

  const handleAddSubBoardPlayer = () => {
    const name = subBoardPlayerName.trim()
    if (!name) return

    setSubBoardPlayers((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name,
        status: 'bench',
        x: 50,
        y: 50,
        position: '',
        fieldSeconds: 0,
        benchSeconds: 0,
        alertSeconds: 0,
        benchRestSeconds: 0,
        soccerPositionGroup: 'Mid',
      },
    ])
    setSubBoardPlayerName('')
  }

  const handleLoadDivisionToSubBoard = () => {
    const divisionPlayers = selectedRoster.map(normalizePlayer)
    setSubBoardPlayers(
      divisionPlayers.map((player) => ({
        id: player.id,
        name: `${player.name}${player.number ? ` #${player.number}` : ''}`,
        status: 'bench',
        x: 50,
        y: 50,
        position: '',
        fieldSeconds: 0,
        benchSeconds: 0,
        alertSeconds: 0,
        benchRestSeconds: 0,
        soccerPositionGroup: player.soccerPositionGroup,
      })),
    )
    setSubBoardRunning(false)
  }

  const handleSubBoardStatusChange = (playerId, status) => {
    setSubBoardPlayers((current) =>
      current.map((player) =>
        player.id === playerId
          ? {
              ...player,
              status,
              x: status === 'active' ? player.x : 50,
              y: status === 'active' ? player.y : 50,
              position: status === 'active' ? player.position : '',
              benchRestSeconds: status === 'active' ? 0 : player.benchRestSeconds ?? 0,
            }
          : player,
      ),
    )
  }

  const handleSubBoardDrop = (event, status) => {
    event.preventDefault()
    const playerId = event.dataTransfer.getData('text/plain')
    if (!playerId) return

    const bounds = event.currentTarget.getBoundingClientRect()
    const x = Math.round(((event.clientX - bounds.left) / bounds.width) * 100)
    const y = Math.round(((event.clientY - bounds.top) / bounds.height) * 100)

    setSubBoardPlayers((current) =>
      current.map((player) =>
        player.id === playerId
          ? {
              ...player,
              status,
              x: status === 'active' ? Math.min(92, Math.max(8, x)) : 50,
              y: status === 'active' ? Math.min(88, Math.max(12, y)) : 50,
              position: status === 'active' ? player.position : '',
              benchRestSeconds: status === 'active' ? 0 : player.benchRestSeconds ?? 0,
            }
          : player,
      ),
    )
  }

  const handleSoftballPositionDrop = (event, position) => {
    event.preventDefault()
    const playerId = event.dataTransfer.getData('text/plain')
    if (!playerId) return

    setSubBoardPlayers((current) =>
      current.map((player) =>
        player.id === playerId
          ? {
              ...player,
              status: 'active',
              x: position.x,
              y: position.y,
              position: position.id,
              benchRestSeconds: 0,
            }
          : player.position === position.id
            ? { ...player, status: 'bench', position: '', x: 50, y: 50 }
            : player,
      ),
    )
  }

  const handleRemoveSubBoardPlayer = (playerId) => {
    setSubBoardPlayers((current) => current.filter((player) => player.id !== playerId))
  }

  const handleResetSubBoardTimers = () => {
    setSubBoardPlayers((current) =>
      current.map((player) => ({
        ...player,
        fieldSeconds: 0,
        benchSeconds: 0,
        alertSeconds: 0,
        benchRestSeconds: 0,
      })),
    )
    setSubBoardClockSeconds(0)
    setSubBoardRunning(false)
  }

  const openGoalPrompt = (team = 'lynx') => {
    const firstActivePlayer = subBoardPlayers.find((player) => player.status === 'active')
    setGoalForm({ team, scorerId: firstActivePlayer?.id ?? '', assistId: '' })
    setIsGoalPromptOpen(true)
  }

  const handleRecordGoal = () => {
    const scorer = subBoardPlayers.find((player) => player.id === goalForm.scorerId)
    const assist = subBoardPlayers.find((player) => player.id === goalForm.assistId)

    if (!scorer) return

    setSoccerScore((current) => ({
      ...current,
      lynx: current.lynx + 1,
    }))
    setSoccerGoals((current) => [
      {
        id: crypto.randomUUID(),
        team: 'lynx',
        scorerId: scorer.id,
        scorer: scorer.name,
        assistId: assist?.id ?? '',
        assist: assist?.name ?? '',
        recordedAt: new Date().toISOString(),
      },
      ...current,
    ])
    setIsGoalPromptOpen(false)
  }

  const handleAddOpponentGoal = () => {
    setSoccerScore((current) => ({ ...current, opponent: current.opponent + 1 }))
  }

  const handleAdjustSoccerScore = (team, amount) => {
    setSoccerScore((current) => ({
      ...current,
      [team]: Math.max(0, current[team] + amount),
    }))
  }

  const handleRemoveSoccerGoal = (goalId) => {
    setSoccerGoals((current) => current.filter((goal) => goal.id !== goalId))
    setSoccerScore((current) => ({ ...current, lynx: Math.max(0, current.lynx - 1) }))
  }

  const resetSoccerScore = () => {
    setSoccerScore({ lynx: 0, opponent: 0 })
    setSoccerGoals([])
    setIsGoalPromptOpen(false)
  }

  const handleScheduleSubmit = (event) => {
    event.preventDefault()
    setError('')
    setCopyLabel('Copy')

    if (!scheduleForm.date || !scheduleForm.startTime) {
      setOutput('')
      setError('Add at least a date and start time for the schedule event.')
      return
    }

    const eventFormData = { ...scheduleForm }
    const repeatCount = eventFormData.repeatCount
    delete eventFormData.repeatCount
    delete eventFormData.noticeType
    delete eventFormData.noticeDetails
    const totalRepeats = editingScheduleEventId ? 1 : Math.min(52, Math.max(1, Number(repeatCount) || 1))
    const repeatGroupId = totalRepeats > 1 ? crypto.randomUUID() : undefined
    const savedEvents = Array.from({ length: totalRepeats }, (_, index) => ({
      ...eventFormData,
      date: index === 0 ? eventFormData.date : addDaysToDateString(eventFormData.date, index * 7),
      id: editingScheduleEventId || crypto.randomUUID(),
      createdAt: scheduleEvents.find((saved) => saved.id === editingScheduleEventId)?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      repeatGroupId,
      repeatIndex: totalRepeats > 1 ? index + 1 : undefined,
      repeatTotal: totalRepeats > 1 ? totalRepeats : undefined,
    }))
    const [savedEvent] = savedEvents

    setScheduleEvents((current) =>
      editingScheduleEventId
        ? current.map((existingEvent) => (existingEvent.id === editingScheduleEventId ? savedEvent : existingEvent))
        : [...current, ...savedEvents],
    )
    setOutput([
      `${buildEventTitle(savedEvent)} ${editingScheduleEventId ? 'updated' : totalRepeats > 1 ? `saved for ${totalRepeats} weeks` : 'saved'}`,
      '',
      `Date: ${formatDateForDisplay(savedEvent.date)}`,
      `Time: ${formatTimeForDisplay(savedEvent.startTime)}${savedEvent.endTime ? `-${formatTimeForDisplay(savedEvent.endTime)}` : ''}`,
      `Location: ${buildEventLocation(savedEvent) || 'TBD'}`,
      savedEvent.baselineSide !== 'not sure / omit' ? `Baseline: ${savedEvent.baselineSide}` : null,
      '',
      'Use the saved event buttons to add it to your calendar or prep a parent message.',
    ].filter(Boolean).join('\n'))
    setEditingScheduleEventId('')
    setScheduleForm(initialScheduleForm)
  }

  const handleEditScheduleEvent = (savedEvent) => {
    setScheduleForm({
      eventType: savedEvent.eventType ?? initialScheduleForm.eventType,
      division: savedEvent.division ?? initialScheduleForm.division,
      title: savedEvent.title ?? '',
      date: savedEvent.date ?? '',
      startTime: savedEvent.startTime ?? '',
      endTime: savedEvent.endTime ?? '',
      location: savedEvent.location ?? '',
      field: savedEvent.field ?? '',
      baselineSide: savedEvent.baselineSide ?? initialScheduleForm.baselineSide,
      notes: savedEvent.notes ?? '',
      reminderTiming: savedEvent.reminderTiming ?? initialScheduleForm.reminderTiming,
      repeatCount: '1',
      noticeType: scheduleForm.noticeType,
      noticeDetails: scheduleForm.noticeDetails,
    })
    setEditingScheduleEventId(savedEvent.id)
    setError('')
  }

  const handleCancelScheduleEdit = () => {
    setEditingScheduleEventId('')
    setScheduleForm(initialScheduleForm)
    setError('')
  }

  const handleDeleteScheduleEvent = (eventId) => {
    setScheduleEvents((current) => current.filter((event) => event.id !== eventId))
    if (editingScheduleEventId === eventId) {
      handleCancelScheduleEdit()
    }
  }

  const fetchGoogleEvents = async () => {
    if (!googleAccessToken) {
      setGoogleStatus('Connect Google Calendar first.')
      return
    }

    const monthStart = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1)
    const monthEnd = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1)
    const params = new URLSearchParams({
      key: GOOGLE_API_KEY,
      singleEvents: 'true',
      orderBy: 'startTime',
      timeMin: monthStart.toISOString(),
      timeMax: monthEnd.toISOString(),
    })

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${googleAccessToken}`,
          },
        },
      )
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error?.message ?? 'Unable to load Google Calendar events.')
      }

      setGoogleEvents(payload.items ?? [])
      setGoogleStatus('Google Calendar events loaded.')
    } catch (calendarError) {
      setGoogleStatus(calendarError.message)
    }
  }

  const addEventToGoogleCalendar = async (event) => {
    if (!googleAccessToken) {
      setGoogleStatus('Connect Google Calendar first.')
      return
    }

    const start = buildDateTime(event.date, event.startTime)
    const end = buildDateTime(event.date, event.endTime || event.startTime)
    if (!start || !end) return

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events?key=${GOOGLE_API_KEY}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${googleAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            summary: buildEventTitle(event),
            location: buildEventLocation(event),
            description: [
              event.notes,
              event.baselineSide !== 'not sure / omit' ? `Baseline side: ${event.baselineSide}` : '',
              `Parent reminder: ${event.reminderTiming}`,
            ].filter(Boolean).join('\n'),
            start: {
              dateTime: start.toISOString(),
            },
            end: {
              dateTime: end.toISOString(),
            },
          }),
        },
      )
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error?.message ?? 'Unable to add event to Google Calendar.')
      }

      setGoogleStatus('Event added to Google Calendar.')
      await fetchGoogleEvents()
    } catch (calendarError) {
      setGoogleStatus(calendarError.message)
    }
  }

  const handleGoogleConnect = () => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_API_KEY || !GOOGLE_CALENDAR_ID) {
      setGoogleStatus('Google Calendar env values are not configured yet.')
      return
    }
    googleTokenClient?.requestAccessToken({ prompt: googleAccessToken ? '' : 'consent' })
  }

  const changeCalendarMonth = (offset) => {
    setCalendarDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  const handlePrepParentMessage = (event) => {
    setFormData((current) => ({
      ...current,
      'parent-message': {
        ...current['parent-message'],
        messageType: `${event.eventType} reminder`,
        date: event.date,
        time: event.startTime,
        location: event.location,
        fieldName: event.field,
        baselineSide: event.baselineSide,
        keyNotes: [event.division ? `${event.division} ${event.eventType}` : '', event.notes].filter(Boolean).join('. '),
        tone: event.eventType === 'Game' ? 'hype' : 'friendly',
      },
    }))
    setSelectedToolId('parent-message')
    setOutput('')
    setError('')
  }

  const handleLineupSubmit = (event) => {
    event.preventDefault()
    setError('')
    setCopyLabel('Copy')

    const divisionPlayers = selectedRoster.map(normalizePlayer)
    const activePlayers = divisionPlayers.filter((player) => availablePlayers[player.id])

    if (activePlayers.length === 0) {
      setOutput('')
      setError('Add players and mark at least one player available.')
      return
    }

    const orderedPlayers =
      lineupStyle === 'shuffle'
        ? [...activePlayers].sort(() => Math.random() - 0.5)
        : lineupStyle === 'performance'
          ? buildSmartLineup(activePlayers)
        : activePlayers

    const benchPlayers = divisionPlayers.filter((player) => !availablePlayers[player.id])
    const lineupText = [
      `${selectedDivision} Batting Lineup${lineupGameLabel ? ` - ${lineupGameLabel}` : ''}`,
      lineupStyle === 'performance' ? 'Built for consistency, speed, spaced power, and no dead pocket.' : null,
      lineupStyle === 'balanced' ? 'Built from saved roster order.' : null,
      lineupStyle === 'shuffle' ? 'Built from shuffled available players.' : null,
      '',
      ...orderedPlayers.map((player, index) => `${index + 1}. ${player.name}${player.number ? ` #${player.number}` : ''}`),
      benchPlayers.length ? '' : null,
      benchPlayers.length ? 'Unavailable / Out' : null,
      ...benchPlayers.map((player) => `- ${player.name}${player.number ? ` #${player.number}` : ''}`),
    ].filter(Boolean).join('\n')

    setOutput(lineupText)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsLoading(true)
    setError('')
    setOutput('')
    setSocialGraphicUrl('')
    setGraphicError('')
    setCopyLabel('Copy')

    try {
      if (isGameDayPost) {
        try {
          const graphic = await createGameDayGraphic(selectedToolData)
          setSocialGraphicUrl(graphic.dataUrl)
          if (!graphic.usedAiBackground) {
            setGraphicError('Premium AI background was unavailable, so the app used the local fallback template.')
          }
        } catch {
          setGraphicError('The social graphic could not be created. Try a PNG or JPG opponent logo.')
        }
      }
      const backendFormData = Object.fromEntries(
        Object.entries(selectedToolData).filter(([, value]) => !(value instanceof File)),
      )
      const generatedText = await generateContent(selectedToolId, backendFormData)
      setOutput(generatedText)
    } catch (submissionError) {
      setError(submissionError.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGraphicDownload = () => {
    if (!socialGraphicUrl) return
    const link = document.createElement('a')
    link.href = socialGraphicUrl
    link.download = `lynx-game-day-${selectedToolData.opponent || 'matchup'}.png`
    link.click()
  }

  const handleCopy = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopyLabel('Copied')
    window.setTimeout(() => setCopyLabel('Copy'), 1800)
  }

  const handleCopyScheduleNotice = async () => {
    await navigator.clipboard.writeText(scheduleNoticeText)
    setNoticeCopyLabel('Copied')
    window.setTimeout(() => setNoticeCopyLabel('Copy Notice'), 1800)
  }

  const handleLogoError = (event) => {
    event.currentTarget.hidden = true
    event.currentTarget.nextElementSibling.hidden = false
  }

  const publicHighlights = [
    'Our mission is to develop confident athletes through effort, discipline, and team-first leadership.',
    'We support multiple sports with organized communication, schedules, and family resources.',
    'We build a connected athlete, parent, and coach experience around development and community.',
  ]

  const calendarEvents = useMemo(() => {
    const localEvents = scheduleEvents.map((event) => ({
      id: `local-${event.id}`,
      title: buildEventTitle(event),
      date: event.date,
      time: event.startTime,
      location: buildEventLocation(event),
      notes: event.notes,
      source: 'Local',
      raw: event,
    }))
    const syncedEvents = googleEvents.map((event) => ({
      id: `google-${event.id}`,
      title: event.summary || 'Calendar event',
      date: (event.start?.dateTime ?? event.start?.date ?? '').slice(0, 10),
      time: (event.start?.dateTime ?? '').slice(11, 16),
      location: event.location || '',
      notes: event.description || '',
      source: 'Google',
      raw: event,
    }))

    return [...localEvents, ...syncedEvents]
      .filter((event) => event.date)
      .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
  }, [googleEvents, scheduleEvents])
  const upcomingEvents = calendarEvents.filter((event) => {
    const eventDate = new Date(`${event.date}T${event.time || '00:00'}:00`)
    return eventDate >= new Date(new Date().toDateString())
  })

  const handleParentMessageSubmit = (event) => {
    event.preventDefault()
    setParentMessage('')
  }

  const openCoachPortal = () => {
    if (['coach', 'admin'].includes(userSession.profile?.role)) {
      setCurrentPortal('coach')
      setCoachSection('tools')
      setCoachRole(userSession.profile.role === 'admin' ? 'admin' : 'coach')
      return
    }

    openUserLogin('coach')
  }

  const openAdminPortal = () => {
    setCurrentPortal('coach')
    setCoachSection('admin')
    setCoachRole('admin')
    loadDirectory()
  }

  const handleGalleryUpload = async (event) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return

    const compressedPhotos = await Promise.all(
      files.slice(0, maxGalleryPhotos).map(async (file) => ({
        id: crypto.randomUUID(),
        src: await compressImageFile(file),
        caption: galleryCaption.trim(),
        createdAt: new Date().toISOString(),
      })),
    )

    setGalleryPhotos((current) => [...compressedPhotos, ...current].slice(0, maxGalleryPhotos))
    setActiveGalleryIndex(0)

    setGalleryCaption('')
    event.target.value = ''
  }

  const handleRemoveGalleryPhoto = (photoId) => {
    setGalleryPhotos((current) => current.filter((photo) => photo.id !== photoId))
    setActiveGalleryIndex(0)
  }

  const handleGalleryStep = (direction) => {
    setActiveGalleryIndex((current) => {
      if (!galleryPhotos.length) return 0
      return (current + direction + galleryPhotos.length) % galleryPhotos.length
    })
  }

  const renderUpcomingEventsModule = (variant = 'parent') => (
    <section className="upcoming-module">
      <div className="upcoming-header">
        <div className="section-heading compact">
          <CalendarDays size={22} aria-hidden="true" />
          <div>
            <p className="eyebrow">Upcoming events</p>
            <h2>{variant === 'coach' ? 'Schedule List & Calendar' : 'Team Schedule'}</h2>
          </div>
        </div>
        {variant === 'coach' && (
          <button className="copy-button" type="button" onClick={fetchGoogleEvents}>Load Google</button>
        )}
      </div>

      <div className="upcoming-layout">
        <div className="event-list-view">
          {upcomingEvents.length === 0 ? (
            <p className="empty-roster">No upcoming events yet.</p>
          ) : (
            upcomingEvents.slice(0, 10).map((event) => (
              <article className="event-list-item" key={event.id}>
                <div className="event-date-badge">
                  <span>{new Date(`${event.date}T00:00:00`).toLocaleString('default', { month: 'short' })}</span>
                  <strong>{new Date(`${event.date}T00:00:00`).getDate()}</strong>
                </div>
                <div>
                  <strong>{event.title}</strong>
                  <span>
                    {formatTimeForDisplay(event.time)}{event.location ? ` | ${event.location}` : ''}
                  </span>
                  {event.notes && <p>{event.notes}</p>}
                </div>
              </article>
            ))
          )}
        </div>

        <div className="mini-calendar">
          <div className="calendar-toolbar compact-toolbar">
            <h3>{calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
            <div className="calendar-actions">
              <button className="copy-button" type="button" onClick={() => changeCalendarMonth(-1)}>Prev</button>
              <button className="copy-button" type="button" onClick={() => changeCalendarMonth(1)}>Next</button>
            </div>
          </div>
          <div className="calendar-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div className="calendar-weekday" key={day}>{day}</div>
            ))}
            {getMonthDays(calendarDate).map((day) => {
              const dateKey = getDateKey(day)
              const dayEvents = calendarEvents.filter((event) => event.date === dateKey)
              const isCurrentMonth = day.getMonth() === calendarDate.getMonth()

              return (
                <div className={`calendar-day ${isCurrentMonth ? '' : 'muted-day'}`} key={dateKey}>
                  <strong>{day.getDate()}</strong>
                  {dayEvents.slice(0, 2).map((event) => (
                    <span className={`calendar-pill ${event.source === 'Google' ? 'synced' : ''}`} key={event.id}>
                      {event.title}
                    </span>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )

  if (currentPortal === 'public') {
    return (
      <main className="site-shell">
        <header className="public-hero">
          <nav className="top-nav" aria-label="Primary">
            <div className="brand-mark">
              <span className="logo-frame" aria-hidden="true">
                <img src={clubLogoPath} alt="" onError={handleLogoError} />
                <span className="logo-fallback" hidden>
                  <Sparkles size={20} aria-hidden="true" />
                </span>
              </span>
              <span>Lynx Athletics</span>
            </div>
            <div className="nav-links">
              <button type="button" onClick={() => (userSession.profile?.role === 'parent' ? setCurrentPortal('parent') : openUserLogin('parent'))}>Parent Login</button>
              <button type="button" onClick={openCoachPortal}>Coach Login</button>
              <button type="button" onClick={openAdminPortal}>Admin Login</button>
            </div>
          </nav>

          <section className="public-hero-content">
            <p className="eyebrow">Purple and gold softball</p>
            <h1>Lynx Athletics</h1>
            <p className="hero-copy">
              A modern athletics organization helping young athletes grow through development, accountability, team culture, and clear family communication.
            </p>
            <div className="public-actions">
              <button className="submit-button" type="button" onClick={() => (userSession.profile?.role === 'parent' ? setCurrentPortal('parent') : openUserLogin('parent'))}>
                <Users size={20} aria-hidden="true" />
                <span>Parent Portal</span>
              </button>
              <button className="secondary-button" type="button" onClick={openCoachPortal}>
                <ShieldCheck size={20} aria-hidden="true" />
                <span>Coach Portal</span>
              </button>
            </div>
          </section>
        </header>

        <section className="public-grid">
          {publicHighlights.map((highlight) => (
            <article className="public-card" key={highlight}>
              <Sparkles size={22} aria-hidden="true" />
              <p>{highlight}</p>
            </article>
          ))}
        </section>

        <section className="gallery-section">
          <div className="section-heading compact">
            <Sparkles size={22} aria-hidden="true" />
            <div>
              <p className="eyebrow">Photo gallery</p>
              <h2>Lynx in Action</h2>
            </div>
          </div>
          {galleryPhotos.length === 0 ? (
            <div className="empty-output">Coach-added photos will appear here.</div>
          ) : (
            <div className="gallery-carousel">
              <figure className="gallery-feature">
                <img src={galleryPhotos[activeGalleryIndex]?.src} alt={galleryPhotos[activeGalleryIndex]?.caption || 'Lynx Athletics gallery'} />
                <figcaption>
                  <span>{galleryPhotos[activeGalleryIndex]?.caption || 'Lynx Athletics'}</span>
                  <small>{activeGalleryIndex + 1} / {galleryPhotos.length}</small>
                </figcaption>
              </figure>
              <div className="carousel-actions">
                <button className="copy-button" type="button" onClick={() => handleGalleryStep(-1)}>Previous</button>
                <button className="copy-button" type="button" onClick={() => handleGalleryStep(1)}>Next</button>
                <button className="copy-button" type="button" onClick={() => setIsGalleryPlaying((current) => !current)}>
                  {isGalleryPlaying ? 'Pause' : 'Play'}
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    )
  }

  if (currentPortal === 'parent') {
    if (userSession.profile?.role !== 'parent') {
      openUserLogin('parent')
      return null
    }

    return (
      <main className="app-shell">
        <nav className="top-nav portal-nav" aria-label="Parent portal">
          <div className="brand-mark">
            <span className="logo-frame" aria-hidden="true">
              <img src={clubLogoPath} alt="" onError={handleLogoError} />
              <span className="logo-fallback" hidden>
                <Sparkles size={20} aria-hidden="true" />
              </span>
            </span>
            <span>Parent Portal</span>
          </div>
          <div className="nav-links">
            <button type="button" onClick={() => setCurrentPortal('public')}>Home</button>
            {['coach', 'admin'].includes(userSession.profile?.role) && <button type="button" onClick={openCoachPortal}>Coach</button>}
            <button type="button" onClick={handleUserLogout}>Log Out</button>
          </div>
        </nav>

        <section className="portal-hero">
          <p className="eyebrow">Family dashboard</p>
          <h1>Team details, reminders, and coach communication.</h1>
          <p className="hero-copy">
            Parents can view upcoming Lynx events, check game and practice details, and send notes to coaches from one mobile-friendly place.
          </p>
        </section>

        {renderUpcomingEventsModule('parent')}

        <section className="parent-dashboard">
          <article className="parent-panel">
            <div className="section-heading compact">
              <MessageCircle size={22} aria-hidden="true" />
              <div>
                <p className="eyebrow">Message</p>
                <h2>Contact Coaches</h2>
              </div>
            </div>
            <form className="parent-message-form" onSubmit={handleParentMessageSubmit}>
              <label htmlFor="parent-message">
                <span>Message</span>
                <textarea
                  id="parent-message"
                  rows="7"
                  placeholder="Ask a question or send a note to the coaching staff."
                  value={parentMessage}
                  onChange={(event) => setParentMessage(event.target.value)}
                />
              </label>
              <button className="submit-button" type="submit">
                <Send size={20} aria-hidden="true" />
                <span>Save Draft</span>
              </button>
              <p className="privacy-note">Messaging is a portal placeholder for now. Real coach delivery will be added with accounts and database setup.</p>
            </form>
          </article>
        </section>
      </main>
    )
  }

  if (currentPortal === 'login') {
    return (
      <main className="app-shell">
        <nav className="top-nav portal-nav" aria-label="Account login">
          <div className="brand-mark">
            <span className="logo-frame" aria-hidden="true">
              <img src={clubLogoPath} alt="" onError={handleLogoError} />
              <span className="logo-fallback" hidden>
                <Sparkles size={20} aria-hidden="true" />
              </span>
            </span>
            <span>Lynx Athletics</span>
          </div>
          <div className="nav-links">
            <button type="button" onClick={() => setCurrentPortal('public')}>Home</button>
          </div>
        </nav>

        <section className="portal-hero">
          <p className="eyebrow">{userLoginRole === 'coach' ? 'Coach login' : 'Parent login'}</p>
          <h1>Log in to your Lynx profile.</h1>
          <p className="hero-copy">Access opens after your invite profile is complete and your waiver acknowledgement is saved.</p>
        </section>

        <section className="registration-panel admin-login-panel">
          <form className="parent-message-form" onSubmit={handleUserLogin}>
            <div className="form-grid">
              <label htmlFor="user-login-email">
                <span>Email</span>
                <input id="user-login-email" type="email" value={userLoginForm.email} onChange={(event) => handleUserLoginChange('email', event.target.value)} />
              </label>
              <label htmlFor="user-login-password">
                <span>Password</span>
                <input id="user-login-password" type="password" value={userLoginForm.password} onChange={(event) => handleUserLoginChange('password', event.target.value)} />
              </label>
            </div>
            {userLoginError && <div className="error-box compact-error">{userLoginError}</div>}
            <button className="submit-button" type="submit">
              <ShieldCheck size={20} aria-hidden="true" />
              <span>Log In</span>
            </button>
            <p className="privacy-note">Need access? Ask an admin for an invite link.</p>
          </form>
        </section>
      </main>
    )
  }

  if (currentPortal === 'register') {
    return (
      <main className="app-shell">
        <nav className="top-nav portal-nav" aria-label="Invite registration">
          <div className="brand-mark">
            <span className="logo-frame" aria-hidden="true">
              <img src={clubLogoPath} alt="" onError={handleLogoError} />
              <span className="logo-fallback" hidden>
                <Sparkles size={20} aria-hidden="true" />
              </span>
            </span>
            <span>Lynx Athletics</span>
          </div>
          <div className="nav-links">
            <button type="button" onClick={() => setCurrentPortal('public')}>Home</button>
          </div>
        </nav>

        <section className="portal-hero">
          <p className="eyebrow">Invite only</p>
          <h1>Complete your Lynx profile.</h1>
          <p className="hero-copy">Use the invite link from Lynx Athletics to create your parent or coach profile and acknowledge club documents.</p>
        </section>

        <section className="registration-panel">
          {registrationError && <div className="error-box compact-error">{registrationError}</div>}
          {registrationStatus ? (
            <div className="restricted-panel">
              <ShieldCheck size={34} aria-hidden="true" />
              <h2>Profile Saved</h2>
              <p>{registrationStatus}</p>
            </div>
          ) : (
            <form className="parent-message-form" onSubmit={handleRegistrationSubmit}>
              <div className="roster-list-header">
                <strong>{activeInvite ? `${activeInvite.role === 'admin' ? 'Admin' : activeInvite.role === 'coach' ? 'Coach' : 'Parent'} invite` : 'Loading invite'}</strong>
                <span>{activeInvite?.email}</span>
              </div>
              <div className="form-grid">
                <label htmlFor="register-first">
                  <span>First name</span>
                  <input id="register-first" value={registrationForm.firstName} onChange={(event) => handleRegistrationChange('firstName', event.target.value)} />
                </label>
                <label htmlFor="register-last">
                  <span>Last name</span>
                  <input id="register-last" value={registrationForm.lastName} onChange={(event) => handleRegistrationChange('lastName', event.target.value)} />
                </label>
                <label htmlFor="register-email">
                  <span>Email</span>
                  <input id="register-email" type="email" value={registrationForm.email} onChange={(event) => handleRegistrationChange('email', event.target.value)} />
                </label>
                <label htmlFor="register-password">
                  <span>Password</span>
                  <input id="register-password" type="password" value={registrationForm.password} onChange={(event) => handleRegistrationChange('password', event.target.value)} />
                </label>
                <label htmlFor="register-confirm-password">
                  <span>Confirm password</span>
                  <input id="register-confirm-password" type="password" value={registrationForm.confirmPassword} onChange={(event) => handleRegistrationChange('confirmPassword', event.target.value)} />
                </label>
                <label htmlFor="register-phone">
                  <span>Phone</span>
                  <input id="register-phone" inputMode="tel" value={registrationForm.phone} onChange={(event) => handleRegistrationChange('phone', event.target.value)} />
                </label>
                <label htmlFor="register-division">
                  <span>Division</span>
                  <select id="register-division" value={registrationForm.division} onChange={(event) => handleRegistrationChange('division', event.target.value)}>
                    {divisionNames.map((division) => <option key={division} value={division}>{division}</option>)}
                  </select>
                </label>
                <label htmlFor="register-team">
                  <span>Team</span>
                  <input id="register-team" value={registrationForm.team} onChange={(event) => handleRegistrationChange('team', event.target.value)} />
                </label>
                {activeInvite?.role === 'parent' && (
                  <>
                    <label htmlFor="register-athlete">
                      <span>Athlete name</span>
                      <input id="register-athlete" value={registrationForm.athleteName} onChange={(event) => handleRegistrationChange('athleteName', event.target.value)} />
                    </label>
                    <label htmlFor="register-secondary-email">
                      <span>Second notification email</span>
                      <input id="register-secondary-email" type="email" value={registrationForm.secondaryEmail} onChange={(event) => handleRegistrationChange('secondaryEmail', event.target.value)} />
                    </label>
                    <label htmlFor="register-secondary-phone">
                      <span>Second notification phone</span>
                      <input id="register-secondary-phone" inputMode="tel" value={registrationForm.secondaryPhone} onChange={(event) => handleRegistrationChange('secondaryPhone', event.target.value)} />
                    </label>
                    <label htmlFor="register-emergency">
                      <span>Emergency contact</span>
                      <input id="register-emergency" value={registrationForm.emergencyContact} onChange={(event) => handleRegistrationChange('emergencyContact', event.target.value)} />
                    </label>
                    <label htmlFor="register-emergency-phone">
                      <span>Emergency phone</span>
                      <input id="register-emergency-phone" inputMode="tel" value={registrationForm.emergencyPhone} onChange={(event) => handleRegistrationChange('emergencyPhone', event.target.value)} />
                    </label>
                  </>
                )}
                {['coach', 'admin'].includes(activeInvite?.role) && (
                  <label htmlFor="register-coach-title">
                    <span>{activeInvite?.role === 'admin' ? 'Admin / coach title' : 'Coach title'}</span>
                    <input id="register-coach-title" placeholder="Director, head coach, assistant coach" value={registrationForm.coachTitle} onChange={(event) => handleRegistrationChange('coachTitle', event.target.value)} />
                  </label>
                )}
              </div>

              <section className="waiver-box">
                <div>
                  <p className="eyebrow">Waiver acknowledgement</p>
                  <p>{waiverText}</p>
                </div>
                <label htmlFor="register-legal-name">
                  <span>Legal name for acknowledgement</span>
                  <input id="register-legal-name" value={registrationForm.legalName} onChange={(event) => handleRegistrationChange('legalName', event.target.value)} />
                </label>
                <label className="check-row" htmlFor="register-waiver">
                  <input id="register-waiver" checked={registrationForm.waiverAccepted} type="checkbox" onChange={(event) => handleRegistrationChange('waiverAccepted', event.target.checked)} />
                  <span>I acknowledge this waiver text and understand Lynx Athletics will retain this record.</span>
                </label>
              </section>

              <button className="submit-button" disabled={!activeInvite} type="submit">
                <ShieldCheck size={20} aria-hidden="true" />
                <span>Complete Profile</span>
              </button>
            </form>
          )}
        </section>
      </main>
    )
  }

  if (currentPortal === 'coach' && coachSection !== 'admin' && !['coach', 'admin'].includes(userSession.profile?.role)) {
    openUserLogin('coach')
    return null
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <img className="hero-watermark" src={clubLogoPath} alt="" aria-hidden="true" />
        <nav className="top-nav" aria-label="Primary">
          <div className="brand-mark">
            <span className="logo-frame" aria-hidden="true">
              <img src={clubLogoPath} alt="" onError={handleLogoError} />
              <span className="logo-fallback" hidden>
                <Sparkles size={20} aria-hidden="true" />
              </span>
            </span>
          <span>Lynx Athletics</span>
          </div>
          <div className="nav-links">
            <button type="button" onClick={() => setCurrentPortal('public')}>Home</button>
            {userSession.profile?.role === 'parent' && <button type="button" onClick={() => setCurrentPortal('parent')}>Parent</button>}
            <a href="#tools">Tools</a>
            {userSession.profile && <button type="button" onClick={handleUserLogout}>Log Out</button>}
          </div>
        </nav>

        <section className="hero-content">
          <p className="eyebrow">Coach portal</p>
          <h1>Lynx Athletics coach backend.</h1>
          <p className="hero-copy">
            Generate polished Lynx Athletics content with purple and gold team spirit while keeping athlete language respectful and development-focused.
          </p>
        </section>
      </header>

      <section id="tools" className="tool-grid" aria-label="Lynx Ops AI tools">
        {tools.map((tool) => {
          const Icon = tool.icon
          const isSelected = tool.id === selectedToolId

          return (
            <button
              className={`tool-card ${isSelected ? 'selected' : ''}`}
              key={tool.id}
              onClick={() => handleToolSelect(tool.id)}
              type="button"
              aria-pressed={isSelected}
            >
              <span className="tool-icon">
                <Icon size={24} aria-hidden="true" />
              </span>
              <span className="tool-card-copy">
                <strong>{tool.name}</strong>
                <span>{tool.description}</span>
              </span>
            </button>
          )
        })}
      </section>

      <section className="coach-section-nav">
        <div className="segmented-control" aria-label="Coach section">
          <button className={coachSection === 'tools' ? 'active' : ''} type="button" onClick={() => setCoachSection('tools')}>Tools</button>
          <button className={coachSection === 'admin' ? 'active' : ''} type="button" onClick={() => setCoachSection('admin')}>Admin</button>
        </div>
        <label htmlFor="coach-role">
          <span>Demo role</span>
          <select id="coach-role" value={coachRole} onChange={(event) => setCoachRole(event.target.value)}>
            <option value="admin">Admin</option>
            <option value="coach">Coach</option>
          </select>
        </label>
      </section>

      {coachSection === 'admin' && (
        <section className="admin-panel">
          {!adminToken ? (
            <div className="registration-panel admin-login-panel">
              <div className="section-heading compact">
                <ShieldCheck size={22} aria-hidden="true" />
                <div>
                  <p className="eyebrow">Admin login</p>
                  <h2>Secure Admin Access</h2>
                </div>
              </div>
              <form className="parent-message-form" onSubmit={handleAdminLogin}>
                <div className="form-grid">
                  <label htmlFor="admin-email">
                    <span>Email</span>
                    <input id="admin-email" type="email" value={adminLoginForm.email} onChange={(event) => handleAdminLoginChange('email', event.target.value)} />
                  </label>
                  <label htmlFor="admin-password">
                    <span>Password</span>
                    <input id="admin-password" type="password" value={adminLoginForm.password} onChange={(event) => handleAdminLoginChange('password', event.target.value)} />
                  </label>
                </div>
                {adminLoginError && <div className="error-box compact-error">{adminLoginError}</div>}
                <button className="submit-button" type="submit">
                  <ShieldCheck size={20} aria-hidden="true" />
                  <span>Log In</span>
                </button>
                <p className="privacy-note">Set ADMIN_EMAIL, ADMIN_PASSWORD, and AUTH_SECRET in the server environment before deploying.</p>
              </form>
            </div>
          ) : coachRole !== 'admin' ? (
            <div className="restricted-panel">
              <ShieldCheck size={34} aria-hidden="true" />
              <h2>Admin Access Required</h2>
              <p>Gallery management and public website settings will be limited to admin accounts once real login is connected.</p>
            </div>
          ) : (
            <div className="admin-stack">
              <div className="coach-gallery-manager">
                <div className="section-heading compact">
                  <Sparkles size={22} aria-hidden="true" />
                  <div>
                    <p className="eyebrow">Public website</p>
                    <h2>Photo Gallery Manager</h2>
                  </div>
                </div>
                <div className="gallery-upload-row">
                  <label htmlFor="gallery-caption">
                    <span>Photo caption</span>
                    <input
                      id="gallery-caption"
                      placeholder="10U tournament weekend, team practice, community event"
                      value={galleryCaption}
                      onChange={(event) => setGalleryCaption(event.target.value)}
                    />
                  </label>
                  <label htmlFor="gallery-upload">
                    <span>Add photos</span>
                    <input id="gallery-upload" accept="image/png,image/jpeg,image/webp" multiple type="file" onChange={handleGalleryUpload} />
                  </label>
                </div>
                <p className="privacy-note">Photos are compressed for the website carousel and the latest {maxGalleryPhotos} are kept locally for this MVP.</p>
                {galleryPhotos.length > 0 && (
                  <div className="gallery-grid compact-gallery">
                    {galleryPhotos.map((photo) => (
                      <figure className="gallery-card" key={photo.id}>
                        <img src={photo.src} alt={photo.caption || 'Lynx Athletics gallery'} />
                        <figcaption>
                          <span>{photo.caption || 'Lynx Athletics'}</span>
                          <button className="icon-button" type="button" onClick={() => handleRemoveGalleryPhoto(photo.id)} aria-label="Remove gallery photo">
                            <Trash2 size={17} aria-hidden="true" />
                          </button>
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                )}
              </div>

              <div className="coach-gallery-manager">
                <div className="section-heading compact">
                  <ShieldCheck size={22} aria-hidden="true" />
                  <div>
                    <p className="eyebrow">Invite only</p>
                    <h2>Profiles & Waivers</h2>
                  </div>
                </div>
                <div className="admin-session-row">
                  <span>Admin session active</span>
                  <button className="copy-button" type="button" onClick={handleAdminLogout}>Log Out</button>
                </div>
                <form className="invite-form" onSubmit={handleCreateInvite}>
                  <label htmlFor="invite-email">
                    <span>Email</span>
                    <input id="invite-email" type="email" value={inviteForm.email} onChange={(event) => handleInviteChange('email', event.target.value)} />
                  </label>
                  <label htmlFor="invite-role">
                    <span>Role</span>
                    <select id="invite-role" value={inviteForm.role} onChange={(event) => handleInviteChange('role', event.target.value)}>
                      <option value="parent">Parent</option>
                      <option value="coach">Coach</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                  <label htmlFor="invite-division">
                    <span>Division</span>
                    <select id="invite-division" value={inviteForm.division} onChange={(event) => handleInviteChange('division', event.target.value)}>
                      {divisionNames.map((division) => <option key={division} value={division}>{division}</option>)}
                    </select>
                  </label>
                  <label htmlFor="invite-team">
                    <span>Team</span>
                    <input id="invite-team" value={inviteForm.team} onChange={(event) => handleInviteChange('team', event.target.value)} />
                  </label>
                  <button className="submit-button" type="submit">
                    <Send size={18} aria-hidden="true" />
                    <span>Create Invite</span>
                  </button>
                  <button className="copy-button" type="button" onClick={loadDirectory}>Refresh</button>
                </form>
                {directoryStatus && <p className="calendar-status">{directoryStatus}</p>}
                {directoryError && <div className="error-box compact-error">{directoryError}</div>}
                {inviteLink && (
                  <div className="invite-link-box">
                    <span>{inviteLink}</span>
                    <a className="copy-button" href={`mailto:${inviteForm.email}?subject=Lynx Athletics invite&body=${encodeURIComponent(`Please complete your Lynx Athletics profile here:\n\n${inviteLink}`)}`}>Email Link</a>
                  </div>
                )}

                <div className="admin-directory-grid">
                  <div className="schedule-list">
                    <div className="roster-list-header">
                      <strong>Profiles</strong>
                      <span>{directory.profiles.length}</span>
                    </div>
                    {directory.profiles.length === 0 ? (
                      <p className="empty-roster">No completed profiles yet.</p>
                    ) : (
                      directory.profiles.map((profile) => (
                        <article className="directory-row" key={profile.id}>
                          <strong>{profile.firstName} {profile.lastName}</strong>
                          <span>{profile.role} | {profile.division} | {profile.team}</span>
                          <span>{profile.email} {profile.phone ? `| ${profile.phone}` : ''}</span>
                          {profile.secondaryEmail || profile.secondaryPhone ? <small>Second notifications: {[profile.secondaryEmail, profile.secondaryPhone].filter(Boolean).join(' | ')}</small> : null}
                          {profile.waiver?.acceptedAt && <small>Waiver: {formatDateForDisplay(profile.waiver.acceptedAt.slice(0, 10))} by {profile.waiver.legalName}</small>}
                          <div className="directory-actions">
                            {profile.role !== 'admin' && (
                              <button className="copy-button" type="button" onClick={() => handleProfileRoleChange(profile.id, 'admin')}>Make Admin</button>
                            )}
                            {profile.role === 'admin' && (
                              <button className="copy-button" type="button" onClick={() => handleProfileRoleChange(profile.id, 'coach')}>Set Coach</button>
                            )}
                            {profile.role !== 'parent' && (
                              <button className="copy-button" type="button" onClick={() => handleProfileRoleChange(profile.id, 'parent')}>Set Parent</button>
                            )}
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                  <div className="schedule-list">
                    <div className="roster-list-header">
                      <strong>Invites</strong>
                      <span>{directory.invites.length}</span>
                    </div>
                    {directory.invites.length === 0 ? (
                      <p className="empty-roster">No invites yet.</p>
                    ) : (
                      directory.invites.map((invite) => (
                        <article className="directory-row" key={invite.id}>
                          <strong>{invite.email}</strong>
                          <span>{invite.role} | {invite.division} | {invite.team}</span>
                          <small>{invite.status} | {formatDateForDisplay(invite.createdAt.slice(0, 10))}</small>
                        </article>
                      ))
                    )}
                  </div>
                </div>
                <p className="privacy-note">MVP note: invites and waivers are stored on the local backend. Final waiver wording, retention policy, and nonprofit compliance should be reviewed before production use.</p>
              </div>
            </div>
          )}
        </section>
      )}

      {coachSection === 'tools' && <section id="generator" className={`workspace ${isSubBoard || isRosterManager || isScheduleAssistant ? 'sub-workspace' : ''}`}>
        <form
          className="generator-panel"
          onSubmit={isLineupBuilder ? handleLineupSubmit : isScheduleAssistant ? handleScheduleSubmit : isSubBoard ? (event) => event.preventDefault() : handleSubmit}
        >
          <div className="section-heading">
            <CalendarDays size={22} aria-hidden="true" />
            <div>
              <p className="eyebrow">Selected tool</p>
              <h2>{selectedTool.name}</h2>
            </div>
          </div>

          {isRosterManager ? (
            <div className="lineup-builder roster-manager">
              <div className="form-grid">
                <label htmlFor="roster-sport">
                  <span>Sport</span>
                  <select id="roster-sport" value={selectedRosterSport} onChange={(event) => setSelectedRosterSport(event.target.value)}>
                    {Object.entries(subBoardSports).map(([value, sport]) => (
                      <option key={value} value={value}>{sport.label}</option>
                    ))}
                  </select>
                </label>
                <label htmlFor="roster-division">
                  <span>Division</span>
                  <select id="roster-division" value={selectedDivision} onChange={(event) => setSelectedDivision(event.target.value)}>
                    {divisionNames.map((division) => (
                      <option key={division} value={division}>{division}</option>
                    ))}
                  </select>
                </label>
                <label htmlFor="roster-team">
                  <span>Team</span>
                  <input id="roster-team" value={selectedTeamName} onChange={(event) => setSelectedTeamName(event.target.value)} placeholder="Team 1, Gold, Purple" />
                </label>
              </div>

              <div className="roster-entry">
                <label htmlFor="roster-new-player">
                  <span>Add player</span>
                  <input
                    id="roster-new-player"
                    onChange={(event) => setNewPlayerName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        handleAddPlayer()
                      }
                    }}
                    placeholder="Player name"
                    value={newPlayerName}
                  />
                </label>
                <label htmlFor="roster-new-player-number">
                  <span>Number</span>
                  <input
                    id="roster-new-player-number"
                    onChange={(event) => setNewPlayerNumber(event.target.value)}
                    placeholder="12"
                    value={newPlayerNumber}
                  />
                </label>
                <button className="secondary-button" onClick={handleAddPlayer} type="button">
                  <Plus size={18} aria-hidden="true" />
                  <span>Add</span>
                </button>
              </div>

              <div className="roster-list">
                <div className="roster-list-header">
                  <strong>{subBoardSports[selectedRosterSport]?.label} | {selectedDivision} | {selectedTeamName || 'Team 1'}</strong>
                  <span>{selectedRoster.length} players saved</span>
                </div>
                {selectedRoster.length === 0 ? (
                  <p className="empty-roster">Build this roster once, then load it into lineup and sub board modules.</p>
                ) : (
                  selectedRoster.map(normalizePlayer).map((player) => (
                    <div className="roster-row stat-row" key={player.id}>
                      <label className="check-row" htmlFor={`roster-player-${player.id}`}>
                        <input checked readOnly id={`roster-player-${player.id}`} type="checkbox" />
                        <span className="player-name-stack">
                          <strong>{player.name}{player.number ? ` #${player.number}` : ''}</strong>
                          {selectedRosterSport === 'soccer' && <small>{player.soccerPositionGroup}</small>}
                        </span>
                      </label>
                      <div className="stat-grid">
                        <label htmlFor={`roster-number-${player.id}`}>
                          <span>#</span>
                          <input id={`roster-number-${player.id}`} value={player.number} onChange={(event) => handlePlayerUpdate(player.id, 'number', event.target.value)} />
                        </label>
                        {sportStatFields[selectedRosterSport].map((field) => (
                          <StatInput field={field} idPrefix="roster" key={field.name} onUpdate={handlePlayerUpdate} player={player} />
                        ))}
                      </div>
                      <button className="icon-button" onClick={() => handleRemovePlayer(player.id)} type="button" aria-label={`Remove ${player.name}`}>
                        <Trash2 size={17} aria-hidden="true" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : isSubBoard ? (
            <div className="sub-board">
              <div className="sub-board-controls">
                <label htmlFor="sub-board-sport">
                  <span>Sport</span>
                  <select
                    id="sub-board-sport"
                    value={subBoardSport}
                    onChange={(event) => {
                      setSubBoardSport(event.target.value)
                      setSelectedRosterSport(event.target.value)
                      setSubBoardRunning(false)
                    }}
                  >
                    {Object.entries(subBoardSports).map(([value, sport]) => (
                      <option key={value} value={value}>{sport.label}</option>
                    ))}
                  </select>
                </label>
                {subBoardSport !== 'flagFootball' && <><label htmlFor="sub-board-division">
                  <span>Division roster</span>
                  <select id="sub-board-division" value={selectedDivision} onChange={(event) => setSelectedDivision(event.target.value)}>
                    {divisionNames.map((division) => (
                      <option key={division} value={division}>{division}</option>
                    ))}
                  </select>
                </label>
                <label htmlFor="sub-board-team">
                  <span>Team</span>
                  <select id="sub-board-team" value={selectedTeamName} onChange={(event) => setSelectedTeamName(event.target.value)}>
                    {availableTeamNames.map((team) => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                </label>
                <button className="secondary-button" type="button" onClick={handleLoadDivisionToSubBoard}>
                  <Users size={18} aria-hidden="true" />
                  <span>Load Roster</span>
                </button>
                </>}
              </div>

              {subBoardSport === 'flagFootball' ? <FlagFootballBoard rosters={rosters} /> : <>
              <div className="roster-entry">
                <label htmlFor="sub-board-player">
                  <span>Add player</span>
                  <input
                    id="sub-board-player"
                    placeholder="Player name"
                    value={subBoardPlayerName}
                    onChange={(event) => setSubBoardPlayerName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        handleAddSubBoardPlayer()
                      }
                    }}
                  />
                </label>
                <button className="secondary-button" type="button" onClick={handleAddSubBoardPlayer}>
                  <Plus size={18} aria-hidden="true" />
                  <span>Add</span>
                </button>
              </div>

              <div className="sub-board-timer-bar">
                <div className={`sub-clock ${subBoardRunning ? 'running' : ''}`}>
                  <span>Game Clock</span>
                  <strong>{formatDuration(subBoardClockSeconds)}</strong>
                </div>
                <button className="submit-button" type="button" onClick={() => setSubBoardRunning((current) => !current)}>
                  <span>{subBoardRunning ? 'Pause Timer' : 'Start Timer'}</span>
                </button>
                <button className="copy-button" type="button" onClick={handleResetSubBoardTimers}>Reset Timers</button>
              </div>

              {subBoardSport === 'soccer' && (
                <section className="soccer-scoreboard">
                  <div className="score-tile">
                    <span>Lynx</span>
                    <strong>{soccerScore.lynx}</strong>
                    <button className="score-remove-button" type="button" onClick={() => handleAdjustSoccerScore('lynx', -1)}>-1</button>
                  </div>
                  <div className="score-divider">-</div>
                  <div className="score-tile">
                    <span>Opponent</span>
                    <strong>{soccerScore.opponent}</strong>
                    <button className="score-remove-button" type="button" onClick={() => handleAdjustSoccerScore('opponent', -1)}>-1</button>
                  </div>
                  <div className="score-actions">
                    <button className="secondary-button" type="button" onClick={() => openGoalPrompt('lynx')}>Record Lynx Goal</button>
                    <button className="copy-button" type="button" onClick={handleAddOpponentGoal}>Opponent Goal</button>
                    <button className="copy-button" type="button" onClick={resetSoccerScore}>Reset Score</button>
                  </div>
                </section>
              )}

              {subBoardSport === 'soccer' && isGoalPromptOpen && (
                <section className="goal-prompt">
                  <div className="section-heading compact">
                    <Trophy size={22} aria-hidden="true" />
                    <div>
                      <p className="eyebrow">Goal recorded</p>
                      <h2>Who scored for Lynx?</h2>
                    </div>
                  </div>
                  <div className="form-grid">
                    <label htmlFor="goal-scorer">
                      <span>Scorer</span>
                      <select id="goal-scorer" value={goalForm.scorerId} onChange={(event) => setGoalForm((current) => ({ ...current, scorerId: event.target.value }))}>
                        <option value="">Select player</option>
                        {subBoardPlayers.map((player) => (
                          <option key={player.id} value={player.id}>{player.name}</option>
                        ))}
                      </select>
                    </label>
                    <label htmlFor="goal-assist">
                      <span>Assist</span>
                      <select id="goal-assist" value={goalForm.assistId} onChange={(event) => setGoalForm((current) => ({ ...current, assistId: event.target.value }))}>
                        <option value="">No assist / not sure</option>
                        {subBoardPlayers.filter((player) => player.id !== goalForm.scorerId).map((player) => (
                          <option key={player.id} value={player.id}>{player.name}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="goal-prompt-actions">
                    <button className="submit-button" type="button" onClick={handleRecordGoal}>Save Goal</button>
                    <button className="copy-button" type="button" onClick={() => setIsGoalPromptOpen(false)}>Cancel</button>
                  </div>
                </section>
              )}

              <div className="sub-board-grid">
                {subBoardSport === 'soccer' ? (
                  <section
                    className="soccer-field-board half-field"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleSubBoardDrop(event, 'active')}
                  >
                    <div className="field-mark center-circle" />
                    <div className="field-mark penalty-box" />
                    <div className="field-mark goal-mouth" />
                    {subBoardPlayers.filter((player) => player.status === 'active').map((player) => (
                      <button
                        className={`field-player-chip timer-${getSubPlayerTone(player)}`}
                        draggable
                        key={player.id}
                        onClick={() => handleSubBoardStatusChange(player.id, 'bench')}
                        onDragStart={(event) => event.dataTransfer.setData('text/plain', player.id)}
                        style={{ left: `${player.x}%`, top: `${player.y}%` }}
                        type="button"
                      >
                        <strong>{player.name}</strong>
                        <small>{player.soccerPositionGroup}</small>
                        <span className="live-timer">In {formatDuration(player.alertSeconds ?? player.fieldSeconds)}</span>
                      </button>
                    ))}
                    {subBoardPlayers.filter((player) => player.status === 'active').length === 0 && (
                      <p className="field-empty-note">Drag bench players onto the field.</p>
                    )}
                  </section>
                ) : subBoardSport === 'softball' ? (
                  <section className="softball-field-board">
                    <div className="softball-diamond" />
                    <div className="softball-infield" />
                    <div className="softball-base home" />
                    <div className="softball-base first" />
                    <div className="softball-base second" />
                    <div className="softball-base third" />
                    {softballPositions.map((position) => {
                      const assignedPlayer = subBoardPlayers.find((player) => player.status === 'active' && player.position === position.id)

                      return (
                        <div
                          className="softball-position-zone"
                          key={position.id}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => handleSoftballPositionDrop(event, position)}
                          style={{ left: `${position.x}%`, top: `${position.y}%` }}
                        >
                          <span>{position.label}</span>
                          {assignedPlayer && (
                            <button
                              className={`softball-player-chip timer-${getSubPlayerTone(assignedPlayer)}`}
                              draggable
                              onClick={() => handleSubBoardStatusChange(assignedPlayer.id, 'bench')}
                              onDragStart={(event) => event.dataTransfer.setData('text/plain', assignedPlayer.id)}
                              type="button"
                            >
                              <strong>{assignedPlayer.name}</strong>
                              <small className="live-timer">In {formatDuration(assignedPlayer.alertSeconds ?? assignedPlayer.fieldSeconds)}</small>
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </section>
                ) : (
                  <section className="sub-column active-column">
                    <h3>{subBoardSports[subBoardSport].activeLabel}</h3>
                    {subBoardPlayers.filter((player) => player.status === 'active').length === 0 ? (
                      <p className="empty-roster">Tap bench players to move them in.</p>
                    ) : (
                      subBoardPlayers.filter((player) => player.status === 'active').map((player) => (
                        <article className={`sub-player-card timer-${getSubPlayerTone(player)}`} key={player.id}>
                          <button type="button" onClick={() => handleSubBoardStatusChange(player.id, 'bench')}>
                            <strong>{player.name}</strong>
                            <span className="live-timer">In: {formatDuration(player.alertSeconds ?? player.fieldSeconds)}</span>
                            <small>Sitting: {formatDuration(player.benchSeconds)}</small>
                          </button>
                          <button className="icon-button" type="button" onClick={() => handleRemoveSubBoardPlayer(player.id)} aria-label={`Remove ${player.name}`}>
                            <Trash2 size={17} aria-hidden="true" />
                          </button>
                        </article>
                      ))
                    )}
                  </section>
                )}

                <section
                  className="sub-column bench-column"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleSubBoardDrop(event, 'bench')}
                >
                  <h3>{subBoardSports[subBoardSport].benchLabel}</h3>
                  {subBoardPlayers.filter((player) => player.status === 'bench').length === 0 ? (
                    <p className="empty-roster">No players on the bench.</p>
                  ) : subBoardSport === 'soccer' ? (
                    <div className="bench-role-groups">
                      {soccerPositionGroups.map((positionGroup) => {
                        const groupPlayers = subBoardPlayers.filter((player) => player.status === 'bench' && player.soccerPositionGroup === positionGroup)

                        return (
                          <div className="bench-role-group" key={positionGroup}>
                            <h4>{positionGroup}</h4>
                            {groupPlayers.length === 0 ? (
                              <p className="empty-roster compact">None</p>
                            ) : (
                              groupPlayers.map((player) => (
                                <article className={`sub-player-card bench-card timer-${getSubPlayerTone(player)}`} key={player.id}>
                                  <button
                                    draggable
                                    type="button"
                                    onClick={() => handleSubBoardStatusChange(player.id, 'active')}
                                    onDragStart={(event) => event.dataTransfer.setData('text/plain', player.id)}
                                  >
                                    <strong>{player.name}</strong>
                                    <small>{player.soccerPositionGroup}</small>
                                    <span className="live-timer">Rest: {formatDuration(player.benchRestSeconds ?? 0)}</span>
                                    <small>In: {formatDuration(player.fieldSeconds)} | Sit: {formatDuration(player.benchSeconds)}</small>
                                  </button>
                                  <button className="icon-button" type="button" onClick={() => handleRemoveSubBoardPlayer(player.id)} aria-label={`Remove ${player.name}`}>
                                    <Trash2 size={17} aria-hidden="true" />
                                  </button>
                                </article>
                              ))
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    subBoardPlayers.filter((player) => player.status === 'bench').map((player) => (
                      <article className={`sub-player-card bench-card timer-${getSubPlayerTone(player)}`} key={player.id}>
                        <button
                          draggable
                          type="button"
                          onClick={() => handleSubBoardStatusChange(player.id, 'active')}
                          onDragStart={(event) => event.dataTransfer.setData('text/plain', player.id)}
                        >
                          <strong>{player.name}</strong>
                          <span className="live-timer">Rest: {formatDuration(player.benchRestSeconds ?? 0)}</span>
                          <small>In: {formatDuration(player.fieldSeconds)}</small>
                        </button>
                        <button className="icon-button" type="button" onClick={() => handleRemoveSubBoardPlayer(player.id)} aria-label={`Remove ${player.name}`}>
                          <Trash2 size={17} aria-hidden="true" />
                        </button>
                      </article>
                    ))
                  )}
                </section>
              </div>

              <div className="sub-summary inline-summary">
                <h3>Sub Timing Summary</h3>
                {subBoardPlayers.length === 0 ? (
                  <p className="empty-roster">Add players or load a team roster to start tracking.</p>
                ) : (
                  [...subBoardPlayers]
                    .sort((a, b) => b.benchSeconds - a.benchSeconds)
                    .map((player) => (
                      <div
                        className={`summary-row timer-${getSubPlayerTone(player)}`}
                        key={player.id}
                      >
                        <strong>{player.name}</strong>
                        <span>{player.status === 'active' ? 'In' : 'Bench'}</span>
                        <span>In {formatDuration(player.fieldSeconds)}</span>
                        <span>Sit {formatDuration(player.benchSeconds)}</span>
                      </div>
                    ))
                )}
                {subBoardSport === 'soccer' && (
                  <div className="goal-log">
                    <h3>Goal Log</h3>
                    {soccerGoals.length === 0 ? (
                      <p className="empty-roster">Goals and assists will appear here.</p>
                    ) : (
                      soccerGoals.map((goal) => (
                        <div className="summary-row goal-row" key={goal.id}>
                          <strong>Lynx</strong>
                          <span>Goal: {goal.scorer}</span>
                          <span>{goal.assist ? `Ast: ${goal.assist}` : 'No assist'}</span>
                          <button className="score-remove-button" type="button" onClick={() => handleRemoveSoccerGoal(goal.id)}>Remove</button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              </>}
            </div>
          ) : isScheduleAssistant ? (
            <div className="schedule-assistant">
              {editingScheduleEventId && (
                <div className="schedule-edit-banner">
                  <div>
                    <p className="eyebrow">Editing saved event</p>
                    <strong>{buildEventTitle(scheduleForm)}</strong>
                  </div>
                  <button className="copy-button" type="button" onClick={handleCancelScheduleEdit}>Cancel Edit</button>
                </div>
              )}

              <div className="form-grid">
                <label htmlFor="schedule-event-type">
                  <span>Event type</span>
                  <select id="schedule-event-type" value={scheduleForm.eventType} onChange={(event) => handleScheduleChange('eventType', event.target.value)}>
                    <option value="Practice">Practice</option>
                    <option value="Game">Game</option>
                    <option value="Tournament">Tournament</option>
                    <option value="Team Event">Team Event</option>
                  </select>
                </label>
                <label htmlFor="schedule-division">
                  <span>Division</span>
                  <select id="schedule-division" value={scheduleForm.division} onChange={(event) => handleScheduleChange('division', event.target.value)}>
                    {divisionNames.map((division) => (
                      <option key={division} value={division}>{division}</option>
                    ))}
                  </select>
                </label>
                <label htmlFor="schedule-title">
                  <span>Event title</span>
                  <input id="schedule-title" placeholder="Practice, vs Wave, Tournament Day 1" value={scheduleForm.title} onChange={(event) => handleScheduleChange('title', event.target.value)} />
                </label>
                <label htmlFor="schedule-date">
                  <span>Date</span>
                  <input id="schedule-date" type="date" value={scheduleForm.date} onChange={(event) => handleScheduleChange('date', event.target.value)} />
                </label>
                <label htmlFor="schedule-start">
                  <span>Start time</span>
                  <input id="schedule-start" type="time" value={scheduleForm.startTime} onChange={(event) => handleScheduleChange('startTime', event.target.value)} />
                </label>
                <label htmlFor="schedule-end">
                  <span>End time</span>
                  <input id="schedule-end" type="time" value={scheduleForm.endTime} onChange={(event) => handleScheduleChange('endTime', event.target.value)} />
                </label>
                <label htmlFor="schedule-location">
                  <span>Place name</span>
                  <input id="schedule-location" placeholder="Rainbow Fields" value={scheduleForm.location} onChange={(event) => handleScheduleChange('location', event.target.value)} />
                </label>
                <label htmlFor="schedule-field">
                  <span>Field</span>
                  <input id="schedule-field" placeholder="Field 4" value={scheduleForm.field} onChange={(event) => handleScheduleChange('field', event.target.value)} />
                </label>
                <label htmlFor="schedule-baseline">
                  <span>Baseline side</span>
                  <select id="schedule-baseline" value={scheduleForm.baselineSide} onChange={(event) => handleScheduleChange('baselineSide', event.target.value)}>
                    <option value="3rd baseline side">3rd baseline side</option>
                    <option value="1st baseline side">1st baseline side</option>
                    <option value="not sure / omit">not sure / omit</option>
                  </select>
                </label>
                <label htmlFor="schedule-reminder">
                  <span>Message reminder</span>
                  <select id="schedule-reminder" value={scheduleForm.reminderTiming} onChange={(event) => handleScheduleChange('reminderTiming', event.target.value)}>
                    <option value="24 hours before">24 hours before</option>
                    <option value="morning of">morning of</option>
                    <option value="2 hours before">2 hours before</option>
                  </select>
                </label>
                <label htmlFor="schedule-repeat">
                  <span>Repeat weekly</span>
                  <select
                    disabled={Boolean(editingScheduleEventId)}
                    id="schedule-repeat"
                    value={scheduleForm.repeatCount}
                    onChange={(event) => handleScheduleChange('repeatCount', event.target.value)}
                  >
                    <option value="1">No repeat</option>
                    <option value="2">2 weeks</option>
                    <option value="4">4 weeks</option>
                    <option value="6">6 weeks</option>
                    <option value="8">8 weeks</option>
                    <option value="10">10 weeks</option>
                    <option value="12">12 weeks</option>
                  </select>
                </label>
                <label className="span-two" htmlFor="schedule-notes">
                  <span>Notes for parent message</span>
                  <textarea id="schedule-notes" rows="4" placeholder="Warmups, uniforms, opponent, parking, bring water" value={scheduleForm.notes} onChange={(event) => handleScheduleChange('notes', event.target.value)} />
                </label>
              </div>

              <div className="schedule-save-row">
                <button className="submit-button" type="submit">
                  <Send size={20} aria-hidden="true" />
                  <span>{editingScheduleEventId ? 'Update Event' : 'Save Event'}</span>
                </button>
              </div>

              <div className="schedule-list">
                <div className="roster-list-header">
                  <strong>Saved events</strong>
                  <span>{scheduleEvents.length} events</span>
                </div>
                {scheduleEvents.length === 0 ? (
                  <p className="empty-roster">Save a practice or game, then use it to add calendar events and prep parent reminders.</p>
                ) : (
                  sortedScheduleEvents.map((savedEvent) => (
                    <article className="schedule-row" key={savedEvent.id}>
                      <div>
                        <strong>{buildEventTitle(savedEvent)}</strong>
                        <span>
                          {formatDateForDisplay(savedEvent.date)} at {formatTimeForDisplay(savedEvent.startTime)}
                          {buildEventLocation(savedEvent) ? ` | ${buildEventLocation(savedEvent)}` : ''}
                        </span>
                        <small>
                          <Bell size={14} aria-hidden="true" />
                          Prep message: {savedEvent.reminderTiming}
                        </small>
                      </div>
                      <div className="schedule-actions">
                        <a className="copy-button" href={buildGoogleCalendarUrl(savedEvent)} target="_blank" rel="noreferrer">
                          <ExternalLink size={17} aria-hidden="true" />
                          <span>Google</span>
                        </a>
                        <button className="copy-button" type="button" onClick={() => downloadIcsEvent(savedEvent)}>
                          <Download size={17} aria-hidden="true" />
                          <span>ICS</span>
                        </button>
                        <button className="copy-button" type="button" onClick={() => addEventToGoogleCalendar(savedEvent)}>
                          <CalendarPlus size={17} aria-hidden="true" />
                          <span>Add Sync</span>
                        </button>
                        <button className="copy-button" type="button" onClick={() => handlePrepParentMessage(savedEvent)}>
                          <Megaphone size={17} aria-hidden="true" />
                          <span>Prep Text</span>
                        </button>
                        <button className="copy-button" type="button" onClick={() => handleEditScheduleEvent(savedEvent)}>
                          <Clipboard size={17} aria-hidden="true" />
                          <span>Edit</span>
                        </button>
                        <button className="icon-button" type="button" onClick={() => handleDeleteScheduleEvent(savedEvent.id)} aria-label={`Delete ${buildEventTitle(savedEvent)}`}>
                          <Trash2 size={17} aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>

              <section className="coach-notice-panel">
                <div className="roster-list-header">
                  <strong>Manual coach notice</strong>
                  <span>Copy-ready reminder or change alert</span>
                </div>
                <div className="coach-notice-body">
                  <div className="form-grid">
                    <label htmlFor="notice-event">
                      <span>Event</span>
                      <select id="notice-event" value={selectedNoticeEvent?.id ?? ''} onChange={(event) => setSelectedNoticeEventId(event.target.value)}>
                        {sortedScheduleEvents.length === 0 ? (
                          <option value="">No saved events yet</option>
                        ) : (
                          sortedScheduleEvents.map((event) => (
                            <option key={event.id} value={event.id}>{buildEventTitle(event)} | {formatDateForDisplay(event.date)}</option>
                          ))
                        )}
                      </select>
                    </label>
                    <label htmlFor="notice-type">
                      <span>Notice type</span>
                      <select id="notice-type" value={scheduleForm.noticeType} onChange={(event) => handleScheduleChange('noticeType', event.target.value)}>
                        <option value="Reminder">Reminder</option>
                        <option value="Schedule Change">Schedule Change</option>
                        <option value="Cancellation">Cancellation</option>
                        <option value="Field Update">Field Update</option>
                      </select>
                    </label>
                    <label className="span-two" htmlFor="notice-details">
                      <span>Notice details</span>
                      <textarea id="notice-details" rows="3" placeholder="Example: Please arrive 15 minutes early, or field changed to Field 2." value={scheduleForm.noticeDetails} onChange={(event) => handleScheduleChange('noticeDetails', event.target.value)} />
                    </label>
                  </div>
                  <div className="notice-preview">
                    <pre>{scheduleNoticeText}</pre>
                    <button className="copy-button" type="button" onClick={handleCopyScheduleNotice}>
                      <Copy size={18} aria-hidden="true" />
                      <span>{noticeCopyLabel}</span>
                    </button>
                  </div>
                </div>
              </section>

              <section className="visual-calendar">
                <div className="calendar-toolbar">
                  <div>
                    <p className="eyebrow">Lynx calendar</p>
                    <h3>{calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                  </div>
                  <div className="calendar-actions">
                    <button className="copy-button" type="button" onClick={() => changeCalendarMonth(-1)}>Prev</button>
                    <button className="copy-button" type="button" onClick={() => changeCalendarMonth(1)}>Next</button>
                    <button className="copy-button" type="button" onClick={handleGoogleConnect}>
                      <ExternalLink size={17} aria-hidden="true" />
                      <span>{googleAccessToken ? 'Reconnect' : 'Connect'}</span>
                    </button>
                    <button className="copy-button" type="button" onClick={fetchGoogleEvents}>Load</button>
                  </div>
                </div>
                {googleStatus && <p className="calendar-status">{googleStatus}</p>}
                <div className="calendar-grid">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div className="calendar-weekday" key={day}>{day}</div>
                  ))}
                  {getMonthDays(calendarDate).map((day) => {
                    const dateKey = getDateKey(day)
                    const localEvents = scheduleEvents.filter((event) => event.date === dateKey)
                    const syncedEvents = googleEvents.filter((event) => (event.start?.dateTime ?? event.start?.date ?? '').slice(0, 10) === dateKey)
                    const isCurrentMonth = day.getMonth() === calendarDate.getMonth()

                    return (
                      <div className={`calendar-day ${isCurrentMonth ? '' : 'muted-day'}`} key={dateKey}>
                        <strong>{day.getDate()}</strong>
                        {[...localEvents.map((event) => ({ id: event.id, title: buildEventTitle(event), source: 'Local' })), ...syncedEvents.map((event) => ({ id: event.id, title: event.summary || 'Calendar event', source: 'Google' }))].slice(0, 3).map((event) => (
                          <span className={`calendar-pill ${event.source === 'Google' ? 'synced' : ''}`} key={`${event.source}-${event.id}`}>
                            {event.title}
                          </span>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </section>
            </div>
          ) : isLineupBuilder ? (
            <div className="lineup-builder">
              <div className="form-grid">
                <label htmlFor="lineup-sport">
                  <span>Sport</span>
                  <select id="lineup-sport" value={selectedRosterSport} onChange={(event) => setSelectedRosterSport(event.target.value)}>
                    {Object.entries(subBoardSports).map(([value, sport]) => (
                      <option key={value} value={value}>{sport.label}</option>
                    ))}
                  </select>
                </label>
                <label htmlFor="lineup-division">
                  <span>Division</span>
                  <select id="lineup-division" value={selectedDivision} onChange={(event) => setSelectedDivision(event.target.value)}>
                    {divisionNames.map((division) => (
                      <option key={division} value={division}>{division}</option>
                    ))}
                  </select>
                </label>
                <label htmlFor="lineup-team">
                  <span>Team</span>
                  <input id="lineup-team" value={selectedTeamName} onChange={(event) => setSelectedTeamName(event.target.value)} placeholder="Team 1, Gold, Purple" />
                </label>
                <label htmlFor="lineup-game-label">
                  <span>Game label</span>
                  <input
                    id="lineup-game-label"
                    onChange={(event) => setLineupGameLabel(event.target.value)}
                    placeholder="vs Wave, Game 1, Playoffs"
                    value={lineupGameLabel}
                  />
                </label>
                <label htmlFor="lineup-style">
                  <span>Lineup style</span>
                  <select id="lineup-style" value={lineupStyle} onChange={(event) => setLineupStyle(event.target.value)}>
                    <option value="performance">Smart lineup: consistency, speed, power spacing</option>
                    <option value="balanced">Use saved roster order</option>
                    <option value="shuffle">Shuffle available players</option>
                  </select>
                </label>
              </div>

              <div className="roster-entry">
                <label htmlFor="new-player">
                  <span>Add player to {selectedDivision}</span>
                  <input
                    id="new-player"
                    onChange={(event) => setNewPlayerName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        handleAddPlayer()
                      }
                    }}
                    placeholder="Player name"
                    value={newPlayerName}
                  />
                </label>
                <label htmlFor="new-player-number">
                  <span>Number</span>
                  <input
                    id="new-player-number"
                    onChange={(event) => setNewPlayerNumber(event.target.value)}
                    placeholder="12"
                    value={newPlayerNumber}
                  />
                </label>
                <button className="secondary-button" onClick={handleAddPlayer} type="button">
                  <Plus size={18} aria-hidden="true" />
                  <span>Add</span>
                </button>
              </div>

              <div className="roster-list">
                <div className="roster-list-header">
                  <strong>{selectedRosterSport} | {selectedDivision} | {selectedTeamName || 'Team 1'} roster</strong>
                  <span>{selectedRoster.length} players saved</span>
                </div>
                {selectedRoster.length === 0 ? (
                  <p className="empty-roster">Add players once and they will stay saved in this browser.</p>
                ) : (
                  selectedRoster.map(normalizePlayer).map((player) => (
                    <div className="roster-row stat-row" key={player.id}>
                      <label className="check-row" htmlFor={`available-${player.id}`}>
                        <input
                          checked={Boolean(availablePlayers[player.id])}
                          id={`available-${player.id}`}
                          onChange={() => handleAvailabilityChange(player.id)}
                          type="checkbox"
                        />
                        <span className="player-name-stack">
                          <strong>{player.name}{player.number ? ` #${player.number}` : ''}</strong>
                          {selectedRosterSport === 'soccer' && <small>{player.soccerPositionGroup}</small>}
                        </span>
                      </label>
                      <div className="stat-grid">
                        <label htmlFor={`number-${player.id}`}>
                          <span>#</span>
                          <input id={`number-${player.id}`} value={player.number} onChange={(event) => handlePlayerUpdate(player.id, 'number', event.target.value)} />
                        </label>
                        {sportStatFields[selectedRosterSport].map((field) => (
                          <StatInput field={field} idPrefix="lineup" key={field.name} onUpdate={handlePlayerUpdate} player={player} />
                        ))}
                      </div>
                      <button className="icon-button" onClick={() => handleRemovePlayer(player.id)} type="button" aria-label={`Remove ${player.name}`}>
                        <Trash2 size={17} aria-hidden="true" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="form-grid">
              {selectedTool.fields.map((field) => (
                <label className={field.type === 'textarea' ? 'span-two' : ''} key={field.name} htmlFor={field.name}>
                  <span>{field.label}</span>
                  <FieldControl
                    field={field}
                    value={selectedToolData[field.name]}
                    onChange={handleFieldChange}
                  />
                </label>
              ))}
            </div>
          )}

          <p className="privacy-note">
            {isRosterManager
              ? 'Rosters are saved by sport, division, and team in this browser for the MVP.'
              : isSubBoard
              ? 'Tap or click a player card to move them between the game and bench. Timers run only while Start Timer is active.'
              : isLineupBuilder
              ? 'Rosters are saved in this browser only. Use first names, nicknames, or jersey numbers if you prefer.'
              : 'Do not enter sensitive child information. Review AI output before sending or posting.'}
          </p>

          {!isSubBoard && !isRosterManager && !isScheduleAssistant && <button className="submit-button" disabled={isLoading} type="submit">
            {isLoading ? <LoaderCircle className="spin" size={20} aria-hidden="true" /> : <Send size={20} aria-hidden="true" />}
            <span>{isLoading ? 'Generating' : isLineupBuilder ? 'Build Lineup' : isScheduleAssistant ? 'Save Event' : 'Generate'}</span>
          </button>}
        </form>

        {!isSubBoard && !isRosterManager && !isScheduleAssistant && <aside className="output-panel" aria-live="polite">
          <div className="output-header">
            <div className="section-heading compact">
              <Clipboard size={21} aria-hidden="true" />
              <div>
                <p className="eyebrow">AI draft</p>
                <h2>Generated Output</h2>
              </div>
            </div>
            <button className="copy-button" disabled={!output} onClick={handleCopy} type="button">
              <Copy size={18} aria-hidden="true" />
              <span>{copyLabel}</span>
            </button>
          </div>

          {error && <div className="error-box">{error}</div>}
          {!error && !output && !isLoading && (
            <div className="empty-output">
              Select a tool, add the details, and generate a draft for review.
            </div>
          )}
          {isLoading && <div className="empty-output">Building a polished Lynx draft...</div>}
          {output && isPracticePlan && (
            <article className="document-preview">
              <header className="document-letterhead">
                <img src={clubLogoPath} alt="" onError={handleLogoError} />
                <div>
                  <p>Lynx Athletics</p>
                  <h3>Practice Itinerary</h3>
                  <span>
                    {selectedToolData.ageGroup || 'Team'} | {selectedToolData.practiceStartTime || 'Start'}-
                    {selectedToolData.practiceEndTime || 'End'}
                  </span>
                </div>
              </header>
              <pre className="generated-text document-text">{output}</pre>
            </article>
          )}
          {output && !isPracticePlan && <pre className="generated-text">{output}</pre>}
          {isGameDayPost && socialGraphicUrl && (
            <section className="social-graphic-panel">
              <div className="social-graphic-header">
                <div>
                  <p className="eyebrow">Social graphic</p>
                  <h3>Weekly Matchup Image</h3>
                </div>
                <button className="copy-button" onClick={handleGraphicDownload} type="button">
                  <Copy size={18} aria-hidden="true" />
                  <span>Download</span>
                </button>
              </div>
              <img src={socialGraphicUrl} alt="Generated Lynx game day matchup graphic" />
            </section>
          )}
          {isGameDayPost && graphicError && <div className="error-box compact-error">{graphicError}</div>}
        </aside>}
      </section>}
    </main>
  )
}

export default App
