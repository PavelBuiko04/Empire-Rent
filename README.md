# Empire Rent Scroll Experience

Premium one-page real estate showcase with cinematic scroll-driven video, fullscreen apartment stories, and responsive interaction patterns for desktop, tablet, and mobile.

## Overview

This project is a static frontend experience focused on high-end presentation:

- Hero video scrub controlled by page scroll
- Animated end-state overlay blocks in the hero
- Apartment cards that expand to fullscreen on click
- Scroll-driven apartment video progression with staged info overlays
- About / Why Choose Us / Team / Consultation / Footer sections
- Responsive behavior with dedicated breakpoints and mobile navigation

## Core Features

### 1. Scroll-Synced Hero

- Hero video is pinned and scrubbed with `GSAP + ScrollTrigger`
- Intro badge fades out based on scroll progress
- End blocks slide in near the end of the hero timeline
- Separate desktop/mobile video sources (`0307-desktop.mp4`, `0307-mobile.mp4`)

### 2. Apartment Fullscreen Flow

- Cards (`apt1`, `apt2`, `apt3`) open into fullscreen with smooth transition
- On open, a dedicated scrub video is used for each apartment
- Progress is controlled by wheel/touch movement
- Info layers include:
  - facts (beds / toilets / sqft)
  - price
  - long description
  - price history (5 years)
  - key highlights
- Back action rewinds progress and returns to card state smoothly

### 3. Responsive UI

- Adaptive navigation (including burger mode on small widths)
- Adjusted layout and overlay behavior across key breakpoints
- Apartment overlay UI optimized for narrow screens
- Section typography and spacing tuned for small devices

### 4. Additional Sections

- **Our Space** showcase grid
- **About Us** editorial layout
- **Why Choose Us** stat cards
- **Team carousel** with animated transitions
- **Consultation template form** (non-submitting UI)
- Styled footer with unified visual language

## Tech Stack

- HTML5
- CSS3 (custom responsive system, no framework)
- Vanilla JavaScript
- [GSAP 3](https://greensock.com/gsap/) + ScrollTrigger (CDN)

## Project Structure

- `index.html` — page markup and interaction logic
- `style.css` — full visual system, responsive rules, component styling
- media assets (`.mp4`, `.png`) — hero, apartments, team visuals

## Local Run

Because this page loads local media files, use a local server instead of opening `index.html` directly.

```bash
# from project root
python3 -m http.server 8080
```

Then open:

- `http://localhost:8080`

## Content / Asset Customization

### Hero video sources

In `index.html`, update:

- `data-src-desktop`
- `data-src-mobile`

### Apartment media

Each apartment card has:

- preview image (`data-portrait-src` / `data-landscape-src`)
- fullscreen scrub video (`.apartment-full-video`)

### Text blocks

You can edit apartment descriptions, price history, and highlights directly in the corresponding card markup.

## Notes

- The consultation block is intentionally UI-only (`type="button"`) and does not submit.
- Multiple responsive overrides are used for apartment overlay behavior on very small widths.
- This codebase is optimized for visual storytelling and interaction smoothness rather than component abstraction.

## Future Improvements

- Split JS into modules
- Extract CSS variables/theme tokens more systematically
- Add lint/format tooling and optional build pipeline
- Add performance budget checks for media assets
