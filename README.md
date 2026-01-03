# Monochrome

Monochrome is a content-focused blogging platform built on the MERN stack. It prioritizes legibility and structure, using a high-contrast design system to present dense information clearly.

**Live Deployment:** [[MONOCHROME](https://monochrome-beryl.vercel.app/)]

## Design Philosophy
The UI moves away from standard "card" layouts, opting instead for a **typography-driven interface**. 

*   **Visual Hierarchy:** Uses a Serif typeface (*Playfair Display*) for headers to establish editorial weight, contrasted with Monospace fonts (*JetBrains Mono*) for metadata (dates, authors, tags) to create a clear separation between content and utility.
*   **High Contrast:** A strict black-and-white palette ensures maximum readability and gives the application a premium, timeless feel.
*   **Masonry Layout:** Posts are arranged in a multi-column masonry grid using pure CSS, allowing for a dense information display that adapts naturally to different screen sizes without wasted whitespace.

## Features

**Authentication & Security**
*   Stateless authentication using JWT (JSON Web Tokens).
*   Google OAuth integration via Google Identity Services.
*   Password hashing with bcrypt.

**Content Management**
*   **Granular Privacy:** Posts can be public (visible to all) or private (encrypted visibility). Private posts are strictly accessible only to the author—even direct API requests from other users are rejected.
*   **Interaction:** Real-time reaction system (Likes/Love) using optimistic UI updates.
*   **Commenting:** Threaded comments stored directly within post documents for fast retrieval.

## Technical Architecture & Pattern Justification

The project follows a decoupled **Client-Server architecture**, hosted separately (Vercel for Frontend, Render for Backend).

### 1. Data Modeling (Embedded Documents)
Instead of normalizing data (creating separate SQL-style tables for Comments or Reactions), I utilized MongoDB's document-oriented nature. 
*   **Pattern:** Embedding.
*   **Justification:** For a blog, read performance is critical. Storing comments and reactions inside the `Post` document allows the frontend to fetch a post and all its context in a single database query, significantly reducing latency compared to joining multiple collections.

### 2. Controller-Service Separation
The backend logic is separated from the routing definitions.
*   **Justification:** This keeps `index.js` clean and ensures that business logic (like checking if a user is allowed to see a private post) is reusable and easy to test.

### 3. Stateless Auth (JWT)
*   **Justification:** Since the frontend and backend live on different domains (Vercel vs Render), managing sessions with cookies is complex and prone to CORS issues. JWTs are sent in the Authorization header, making the backend completely stateless and easier to scale.

### 4. Vanilla CSS
*   **Justification:** Tailwind was removed in favor of semantic, vanilla CSS with CSS Variables. This reduces the build bundle size and provides finer control over the specific typographic details required for the monochrome theme.

## Setup Instructions

### Backend
1. Navigate to `server`
2. `npm install`
3. Create `.env` file: