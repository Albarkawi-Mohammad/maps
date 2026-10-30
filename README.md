# Maps — Navigation Prototype

A browser-based map and navigation prototype for exploring places and planning journeys.

## What it does

- Displays interactive maps with 2D and 3D views.
- Searches for places and previews driving routes with distance and travel-time estimates.
- Shows navigation directions and lets users save favorite destinations.
- Includes a driving simulation for exploring the navigation interface.

## How it helps

Maps brings destination discovery, route previews, and saved places into one interface. It also serves as a practical demonstration of a modern navigation experience.

This is a prototype. Lane guidance, speed limits, and right-of-way indicators include demonstration logic and are not validated driving guidance. Online maps, search, and routing require external services; the offline fallback is not road navigation.

## Run locally

Requires Node.js and npm.

```sh
npm install
npm run dev
```

Built with React, TypeScript, Vite, and MapLibre.

## Location data

The app can request device location and save favorites and timeline data in the browser. Search and routing requests go to external map services. This repository contains no personal saved destinations or location history.
