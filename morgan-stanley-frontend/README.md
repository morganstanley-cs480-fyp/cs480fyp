# Morgan Stanley Front (SMUMS :>)

## Quick Start

### Frontend Setup
To run the frontend:
```bash
cd morgan-stanley-frontend
npm install
npm run dev
```

### Backend Setup
To run the backend services (required for search functionality):
```bash
cd services

# Start PostgreSQL and Redis first
docker-compose up -d postgres redis

# Wait for services to be healthy, then start search service
docker-compose up search-service
```

The backend services will be available at:
- Search Service API: http://localhost:8000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

To stop all services:
```bash
cd services
docker-compose down
```

- Directory setup in `src`
  - `assets` -> just contains the icon on the browser.
  - `components/ui` -> shadcn components get installed here here - e.g: `npx shadcn-ui@latest add button`
  - `components/` -> any components that are created manually go here
  - `pages` -> each different page / view goes here
  - `./routes.tsx` -> routes go here
  - `./App.tsx` -> root component of application
  - `./main.tsx` -> application entry point


- Tailwind CSS base styles setup in `index.css`
  - In `index.css`, `@theme` defines custom CSS attributes you can use. 
  - For example, `@theme` defines `--radius--sm` as `calc(var(--radius) - 4px)`.
  - It can be used like so in a div class`div <className=rounded-[var(--radius-sm)]> Using small radius!</div>`

## Color Scheme Requirements

**Text Colors:**
- Word colors should **ONLY** be black or white
- Primary text: `text-black`
- Secondary/label text: `text-black/75` (75% opacity)
- Muted/disabled text: `text-black/50` (50% opacity)
- Light text on dark backgrounds: `text-white` or `text-white/70`

**Brand Color:**
- Any blue color must use: `#002B51` (Morgan Stanley brand blue)
- Use for buttons, icons, accents, and interactive elements
- Examples: `bg-[#002B51]`, `text-[#002B51]`, `border-[#002B51]`

**Do NOT use:**
- Grey/slate text colors (text-slate-*, text-gray-*)
- Other blue shades (blue-500, blue-600, #2563eb, etc.)
  