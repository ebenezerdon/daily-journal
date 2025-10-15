# Daily Journal

Daily Journal is a privacy-first journaling web app built for thoughtful capture and quick discovery. It is built by [Teda.dev](https://teda.dev), the simplest AI app builder for regular people, and focuses on simplicity, beautiful design, and local data persistence.

Features
- Create daily entries with title and rich content
- Tag entries (comma separated) for organization
- Quick mood logging with emoji choices
- Instant search by text, tag, or mood
- Edit and delete entries with an accessible UI
- Export and import JSON backups
- All data persists locally in your browser via localStorage

Files
- index.html - marketing-focused landing page with a bento-box hero and CTA to app.html
- app.html - main application UI with editor, search, bento-grid of entries, and import/export
- styles/main.css - custom CSS for the bento grid and responsive tweaks
- scripts/helpers.js - storage, id and date utilities, and import/export helpers
- scripts/ui.js - UI rendering and event wiring; defines window.App.init and window.App.render
- scripts/main.js - entry point that initializes the app

How to run
1. Open index.html in any modern browser. Click "Start journaling" to go to the app.
2. Use the quick form to create entries. Search and filters update in real time.

Accessibility and UX notes
- Semantic HTML and keyboard navigable cards
- Respect for prefers-reduced-motion via minimal animations
- High contrast and readable typography

License
MIT
