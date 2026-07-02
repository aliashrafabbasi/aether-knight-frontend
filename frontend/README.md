# Aether Knight — Frontend

React + TypeScript frontend for **Aether Knight**, a real-time AI voice assistant with a JARVIS-style voice room UI.

## Tech stack

- React 18 + TypeScript
- Vite
- React Router
- TanStack Query
- Zustand (auth persistence)
- Tailwind CSS
- Canvas Web Audio visualization (JARVIS wave core)

## Prerequisites

- Node.js 18+
- [Aether Knight backend](https://github.com/) running at `http://127.0.0.1:8000`

## Setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://127.0.0.1:8000` | FastAPI backend base URL |

WebSocket URLs are derived automatically (`ws://` or `wss://`).

## Routes

| Route | Access | Description |
|-------|--------|-------------|
| `/login` | Public | Email + password login |
| `/register` | Public | Create account |
| `/home` | Authenticated | Chat hub — new chat, resume, delete |
| `/voice/:sessionId` | Authenticated | Live voice room with JARVIS UI |
| `/admin` | Admin only | User management |

## CORS

The Vite dev server runs on port **5173**. If API requests fail with CORS errors, add this to your FastAPI app:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

## Voice room

- Duplex microphone with VAD (voice activity detection)
- Barge-in while the AI speaks or thinks
- Audio-reactive JARVIS wave visualization during TTS playback
- Transcript log (user = cyan, AI = gold, system = gray)
- **Use headphones** to avoid echo feedback

## Project structure

```
src/
├── api/              # Typed REST client
├── components/       # UI components (JarvisWave, TranscriptLog, …)
├── context/          # Toast notifications
├── hooks/            # VoiceClient (ported from backend voice_client.js)
├── pages/            # Route pages
├── store/            # Zustand auth store
└── types/            # Shared TypeScript types
```
