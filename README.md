# Monochrome

A MERN stack blogging platform focusing on high information density and strict typography.

**Deployment:** https://monochrome-beryl.vercel.app

## The Design
The UI completely avoids standard "card" frameworks. Instead, it relies on a custom design system built with Vanilla CSS variables:

*   **Typography Mix:** I used *Playfair Display* (Serif) for headings to give it an editorial weight, contrasted with *JetBrains Mono* for metadata (dates, authors, tags). This creates a clear visual separation between "content" and "utility" data.
*   **Masonry Layout:** Instead of a generic vertical list, posts flow into a responsive multi-column grid. This mimics a print layout and keeps the viewport content-dense on larger screens.
*   **High Contrast:** Pure black and white (`#09090b` vs `#ffffff`). No greyscale backgrounds, just borders and whitespace for separation.

## Features
*   **Auth:** JWT-based authentication supporting both standard Email/Password and Google OAuth.
*   **Privacy Logic:**
    *   **Public:** Visible to the world.
    *   **Private:** Visible *only* to the author. The backend filters these out at the query level for feed requests, and blocks direct ID access for unauthorized users.
*   **Reactions:** Authenticated users can react to posts. State is handled optimistically for immediate UI feedback.

## Technical Patterns & Justification

**1. Authentication (Stateless JWT)**
I chose JWTs over server-side sessions. Since the frontend (Vercel) and backend (Render) live on different domains, managing cookies is fragile. Sending the token in the `Authorization` header is cleaner and makes the backend stateless/easier to scale.

**2. Data Modeling (Embedded Schemas)**
Reactions are stored directly inside the `Post` document as an array of objects, rather than in a separate SQL-style table.
*   *Why:* We almost never need to query reactions in isolation (e.g., "show me all reactions by User X"). We only need them when loading a post. Embedding them saves a database lookup and speeds up the feed.

**3. CSS Variables over Tailwind**
I removed Tailwind CSS in the final build.
*   *Why:* For a design this specific (custom fonts, specific masonry behavior), writing standard CSS with variables (`--font-serif`, `--container-width`) resulted in cleaner markup and a smaller final bundle size than utility class soup.

## Local Setup

**Backend**
```bash
cd server
npm install
# Create .env with: MONGO_URI, JWT_SECRET, GOOGLE_CLIENT_ID
npm run dev