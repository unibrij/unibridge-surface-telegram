# UniBridge Telegram Surface

Telegram Mini‑App surface for interacting with the **UniBridge
Protocol**.

This surface provides a minimal wallet interface that allows a user to:

1.  Create a transfer session
2.  Resolve routing
3.  Quote the route
4.  Create a settlement
5.  Open a Transak funding widget
6.  Confirm settlement after payment

The surface acts as a **proxy client** that signs UniBridge API requests
with HMAC and forwards them securely.

------------------------------------------------------------------------

# Architecture

Telegram Mini App │ ▼ Telegram WebApp UI (index.html + app.js) │ ▼
Surface Proxy Server (server/server.js) │ HMAC signing │ ▼ UniBridge API
│ ▼ Ramp Provider (Transak)

------------------------------------------------------------------------

# Project Structure

unibridge-surface-telegram │ ├── public │ ├── index.html │ ├── app.js │
└── styles.css │ ├── server │ └── server.js │ ├── package.json └──
README.md

------------------------------------------------------------------------

# Requirements

Node.js **18+**

Check version:

node -v

------------------------------------------------------------------------

# Installation

git clone https://github.com/YOUR_ORG/unibridge-surface-telegram.git cd
unibridge-surface-telegram npm install

------------------------------------------------------------------------

# Environment Variables

SURFACE_HMAC_SECRET=your_partner_secret

Example:

export SURFACE_HMAC_SECRET=abc123

------------------------------------------------------------------------

# Run Server

npm start

Server will run at:

http://localhost:3000

------------------------------------------------------------------------

# Development Mode

npm run dev

------------------------------------------------------------------------

# UniBridge API Proxy

POST /api/\*

Allowed endpoints:

session/register session/resolve session/quote settlement/create
settlement/confirm funding/session

------------------------------------------------------------------------

# Transfer Flow

1 Register Session\
POST /session/register

2 Resolve Session\
POST /session/resolve

3 Quote Route\
POST /session/quote

4 Create Settlement\
POST /settlement/create

5 Funding Session\
POST /funding/session

6 User Payment via Transak

7 Confirm Settlement\
POST /settlement/confirm

------------------------------------------------------------------------

# Telegram Integration

Telegram user id automatically becomes:

tg\_`<telegram_user_id>`{=html}

Example:

tg_123456789

------------------------------------------------------------------------

# Security

The HMAC secret is **never exposed to the browser**.

Signing occurs only inside:

server/server.js

------------------------------------------------------------------------

# Deployment

You can deploy this surface on:

-   Vercel
-   Railway
-   Fly.io
-   Google Cloud Run
-   VPS

Requirement: **Node 18+**

------------------------------------------------------------------------

# License

Internal project for **UniBridge Protocol**
