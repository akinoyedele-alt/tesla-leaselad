# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LeaseLad is a single-page React application for tracking Tesla vehicle lease mileage against lease allowances. It integrates with the Tessie API to pull real-time vehicle data (odometer, battery, location, climate, security status) and calculates lease variance metrics.

## Commands

- `npm run dev` — Start Vite dev server (localhost:5173)
- `npm run build` — Production build to `dist/`
- `npm run lint` — ESLint with zero warnings tolerance
- `npm run preview` — Preview production build locally

No test framework is configured.

## Architecture

The app is a single-component architecture in `src/App.jsx` (~665 lines) with two views toggled via a `view` state variable:

- **Dashboard**: Displays lease stats (variance, odometer, projected mileage), vehicle status (battery, charging, temperature), security info, embedded Google Maps location, and a time-vs-mileage progress bar.
- **Settings**: Configuration form for lease parameters (start date, duration, mile limit, starting odometer) and Tessie API token. Includes "Sync with Tessie" and "Try Demo Mode" actions.

### State & Persistence

All config is persisted to `localStorage` under key `leaselad_config_v1`. State is managed with React `useState` hooks — no external state library.

### API Integration

Tessie API (`https://api.tessie.com`) endpoints:
- `GET /vehicles` — list vehicles by API token
- `GET /{vin}/state` — full vehicle state (odometer, battery, climate, location, lock/sentry status)

### Styling

Tailwind CSS utility classes are used throughout JSX. Icons come from `lucide-react`.

## Lint Rules

ESLint uses flat config format. Key custom rule: `no-unused-vars` ignores variables matching `^[A-Z_]` (uppercase constants). Strict mode — max warnings is 0.
