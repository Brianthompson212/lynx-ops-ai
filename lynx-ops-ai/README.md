# Lynx Ops AI

Lynx Ops AI is a full-stack MVP that helps a youth softball coach generate club operations content faster and cleaner.

The MVP includes three tools:

- Parent Message Generator
- Practice Plan Builder
- Game Day Post Generator

The app uses a React + Vite frontend, an Express backend, and the OpenAI API.

## Project Structure

```text
lynx-ops-ai/
  client/
    src/
      App.jsx
      api.js
      components/
  server/
    index.js
    .env.example
```

## Prerequisites

- Node.js 20 or newer
- An OpenAI API key

## Backend Setup

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

Update `server/.env`:

```bash
OPENAI_API_KEY=your_api_key_here
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change_this_password
AUTH_SECRET=change_this_to_a_long_random_secret
DATA_DIR=./data
```

Do not commit `.env`.

## Frontend Setup

In a second terminal:

```bash
cd client
npm install
npm run dev
```

Open the Vite URL shown in the terminal, usually `http://localhost:5173`.

## Club Logo

To show your real club logo in the app, add a PNG file here:

```text
client/public/lynx-logo.png
```

Restart the frontend dev server after adding or replacing the file.

## API

`POST /api/generate`

Request body:

```json
{
  "toolType": "parent-message",
  "formData": {
    "messageType": "Practice reminder",
    "date": "June 1",
    "time": "6:00 PM",
    "location": "Lynx Field",
    "keyNotes": "Bring water and cleats"
  }
}
```

Response body:

```json
{
  "text": "Generated content..."
}
```

## Privacy and Safety Notes

- Do not enter sensitive child information.
- Review AI output before sending it to families or posting publicly.
- Keep player-related language development-focused, respectful, and encouraging.
- Before live testing with real families, use a real admin password, a long random `AUTH_SECRET`, and a backend host with persistent storage.
- The MVP waiver acknowledgement is a technical capture flow, not legal advice. Have final waiver text and retention policy reviewed before relying on it.

## Live Test Deployment Checklist

1. Deploy the backend first.
2. Set backend environment variables:
   - `OPENAI_API_KEY`
   - `CLIENT_ORIGIN`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `AUTH_SECRET`
   - `DATA_DIR`
3. Deploy the frontend.
4. Set frontend environment variables:
   - `VITE_API_BASE_URL`
   - Google calendar variables if using calendar sync
5. Update backend `CLIENT_ORIGIN` to the final frontend URL.
6. Log in through Admin Login and create coach/admin invite links.
