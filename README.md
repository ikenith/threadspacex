# Threadspacex

Threadspacex is a minimalist, artistic, and infinite-canvas thinking tool designed for deep idea exploration and visual knowledge mapping. 

> Threadspacex gives you an endless canvas to structure thoughts, connect references, weave conceptual threads, and build a second brain without boundaries.

## Features

- **Infinite Nested Canvases:** Group ideas into infinite nested spaces. Double-click any canvas node to enter a deeper level of thought, and use breadcrumbs to navigate your visual hierarchy.
- **Flexible Edge Connections:** Connect notes from anywhere. Nodes feature fine-grained connection handles that appear on hover, giving you perfect layout control.
- **Multimedia Nodes:**
  - **Text Notes:** Write robust markdown-friendly thoughts. Apply varied colors to categorize patterns instantly.
  - **Rich Web Links:** Paste a URL, and Threadspacex automatically fetches stunning embedded previews and metadata via Microlink.
  - **Images:** Snap or upload images directly into your canvas. Click on images to view them in a distraction-free fullscreen overlay.
- **Smart Data Management:** 
  - Entirely local-first. Your data is stored securely in IndexedDB so you never lose your flow.
  - Never forget to back up again with proactive exit reminders.
  - Export your canvas state to JSON to create manual snapshots, or Import existing states to continue working.
  - Export beautiful PNG Images and PDFs of your canvas.
- **Artistic Visual Identity:** Fluid animations, a starlight glowing dark theme, seamless glassmorphism components, and minimalist typography.

## Getting Started

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open the application in your browser and start weaving your threads.

## Technology Stack

- **React 18** and **Vite** for the underlying architecture.
- **Tailwind CSS** for the slick, custom glassmorphic styling system.
- **Zustand** for rock-solid reactive global state management and state persistence with IndexedDB.
- **React Flow** power-charging the canvas and node interactions.
- **Lucide React** for crisp, scalable system icons.
- **Framer Motion** driving the fluid, spring-physics-based animations.

## Usage Guide

- **Pan canvas**: Click and drag empty space or hold Spacebar.
- **Zoom canvas**: Scroll up and down or use pinch gestures on a trackpad.
- **Add nodes**: Use the floating toolbar at the bottom center to add Text Notes, URLs, empty Canvas Nodes, or to upload Images.
- **Connect nodes**: Hover over any edge of a node to reveal connection points, and drag lines to establish relationships.
- **Edit nodes**: Select a node to reveal the properties panel on the right. You can assign labels, tweak text, or add identifying colors.
- **Search**: Press `CMD+K` / `CTRL+K` (or click the search button) to perform global searches for any of your notes across all nested spaces.
