# Morgan Stanley Front (SMUMS :>)

To run the project, remember to `cd morgan-stanley-frontend` before running `npm run install` followed by `npm run dev`

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
  