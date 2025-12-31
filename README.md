# Elegant Light Blog
## Setup Instructions

### 1. Google Auth Setup
1. Go to Google Cloud Console.
2. Create a Project > APIs & Services > Credentials.
3. Create OAuth Client ID (Web Application).
4. **Authorized Origins:** `http://localhost:5173`
5. **Copy the Client ID.**
6. Paste it in `server/.env`
7. Paste it in `client/src/main.jsx`

### 2. Backend (Server)
1. Open terminal in `server`.
2. `npm install`
3. `npm run dev`

### 3. Frontend (Client)
1. Open terminal in `client`.
2. `npm install`
3. `npm run dev`
