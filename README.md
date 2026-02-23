# Pixel Office

A standalone React + Canvas 2D pixel-art office visualizer for OpenClaw agent sessions. Watch your AI agents work in a virtual office -- each agent gets a desk, walks around, and shows real-time status as they execute tasks.

![Screenshot placeholder](docs/screenshot.png)

## Features

- Real-time pixel-art office with animated agent characters
- Connects to OpenClaw gateway to visualize live agent sessions
- Agent identity: displays session name, model, and role
- Status indicators: green glow (active), yellow (waiting), grey (idle)
- Role-based sprite palettes (coders, researchers, planners get distinct looks)
- Interactive layout editor with undo/redo, furniture placement, and color controls
- Speech bubbles for permission requests and waiting states
- Matrix-style spawn/despawn animations
- Mock mode for demo and development

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open `http://localhost:5173` in your browser.

## Connecting to OpenClaw

1. Enter your OpenClaw gateway URL and API token on the connection screen
2. The adapter polls `/sessions_list` and maps sessions to office agents
3. Credentials are saved to localStorage for auto-reconnect

## Mock Mode

Add `?mock=true` to the URL to run with simulated agents:

```
http://localhost:5173/?mock=true
```

This creates 3 mock agents that cycle through tool activities -- useful for development and demos without a running OpenClaw instance.

## Architecture

```
src/
  App.tsx                    # Root component, connection management
  ConnectionScreen.tsx       # Gateway URL + token input
  openclawAdapter.ts         # OpenClaw API poller, event bridge
  mockProvider.ts            # Mock data for demo mode
  eventBus.ts                # Internal pub/sub (replaces VS Code postMessage)
  hooks/
    useExtensionMessages.ts  # React hook consuming event bus
  office/
    engine/
      officeState.ts         # Game state: characters, seats, pathfinding
      characters.ts          # Character FSM (idle, walk, type)
      renderer.ts            # Canvas 2D rendering (tiles, furniture, characters)
      gameLoop.ts            # requestAnimationFrame loop
    layout/
      furnitureCatalog.ts    # Furniture type definitions
      layoutSerializer.ts    # Layout JSON to/from game state
      tileMap.ts             # Tile walkability + A* pathfinding
    sprites/
      spriteData.ts          # Pixel art sprite definitions
      spriteCache.ts         # Cached scaled sprites
    components/
      OfficeCanvas.tsx        # Canvas element + input handling
      ToolOverlay.tsx         # HTML overlay for tool activity display
    editor/                  # Layout editor tools
  components/
    AgentLabels.tsx          # Agent name labels above characters
    ZoomControls.tsx         # Zoom +/- buttons
    BottomToolbar.tsx        # Edit mode + settings toggle
    DebugView.tsx            # Debug panel for agent state inspection
public/
  assets/
    default-layout.json     # Default office layout
```

## Tech Stack

- **React 19** with TypeScript
- **Vite** for build tooling
- **Canvas 2D** for pixel-art rendering (no WebGL)
- **Custom event bus** for decoupled component communication
- **A* pathfinding** for character navigation
- **FS Pixel Sans** bitmap font

## Layout Editor

Press the **Layout** button (bottom-left) to enter edit mode:

- Paint floor tiles and walls
- Place furniture (desks, chairs, bookshelves, plants, etc.)
- Select, move, rotate, and delete items
- Undo/redo with Ctrl+Z / Ctrl+Y
- Save layouts (persisted via event bus)

## License

Proprietary. All rights reserved.
