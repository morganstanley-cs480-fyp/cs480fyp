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