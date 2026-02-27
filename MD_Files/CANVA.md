Here's a comprehensive, detailed prompt you can use to generate the most robust infinite canvas brainstorming dashboard:

---

## 🧠 Master Prompt: Infinite Canvas Brainstorming & Ideas Dashboard

---

**Build a fully functional, production-grade infinite canvas brainstorming web application as a single-file React JSX artifact. This is a professional-grade mind mapping and visual thinking tool — think Miro, FigJam, and Notion combined — but built entirely in-browser with persistent local state.**

---

### 🎨 Aesthetic Direction

Use a **dark, refined, editorial aesthetic** — deep charcoal backgrounds (`#0f0f11`), warm off-white text, electric accent color (e.g. `#6EE7B7` mint or `#F59E0B` amber). Typography should use a distinctive pairing: a geometric display font (e.g. `DM Sans` or `Sora` from Google Fonts) for UI labels and a clean mono font for node text. The toolbar should feel like a premium design tool — minimal chrome, maximum power. Subtle grid dot pattern on the canvas background. Smooth CSS transitions on all interactions.

---

### 📐 Core Canvas Architecture

**Infinite scrollable/pannable canvas:**

- Pan by clicking and dragging the canvas background (middle mouse or spacebar+drag)
- Zoom in/out with scroll wheel (scale from 0.1x to 5x), with zoom level indicator in corner
- Canvas coordinate system (world-space vs screen-space transformation matrix)
- Minimap in bottom-right corner showing full board overview with viewport indicator
- Canvas grid with subtle dots that scale with zoom level

---

### 🗂️ Board Management System

**Multiple named boards (tabs/sidebar):**

- Sidebar or top bar showing all saved boards
- Create new board with a name and optional emoji icon
- Rename, duplicate, delete boards
- Each board tagged with: **type** (`Learning`, `Project`, `Brainstorm`, `Planning`, `Personal`), **color label**, and **last edited timestamp**
- Board list sortable by recent / alphabetical / type
- Search boards by name or tag
- All boards saved to `localStorage` as JSON with versioning

---

### 🧩 Node / Card Types (all draggable, resizable, connectable)

Every node must be:

- **Freely positionable** anywhere on the canvas (drag to move)
- **Resizable** via corner/edge handles
- **Selectable** (click) and **multi-selectable** (shift+click or lasso drag)
- **Lockable** to prevent accidental moves
- **Deletable** (Delete key or right-click context menu)
- **Z-index controllable** (bring to front / send to back)
- **Copyable/pasteable** (Ctrl+C / Ctrl+V)

**Node types to implement:**

1. **Text Card** — Rich inline text, font size selector (10–72px), font family selector (at least 5 options), bold/italic/underline, text color, background color, border style (solid/dashed/dotted/none), border radius, shadow toggle
2. **Sticky Note** — Colorful sticky with a slight rotation, quick-add from toolbar
3. **Image Node** — Upload or paste image from clipboard; image fits inside resizable frame
4. **Shape Node** — Rectangle, rounded rect, circle, diamond, triangle, hexagon; fill color, border color, opacity slider
5. **Arrow / Connector** — Bezier curve or straight line connecting two nodes; with arrowhead styles (none, arrow, filled, open), line thickness, color, label in middle, animated dashed option
6. **Free Draw** — Freehand pen drawing tool with color/thickness picker
7. **Number Badge** — Circular numbered marker (1, 2, 3…) for sequencing steps
8. **Section Frame** — A large labeled grouping region that nodes can sit inside; color-coded with a title header
9. **Embed Card** — A card that displays a URL title + description + favicon (manually entered)
10. **Checklist Card** — A card with checkbox items, progress bar at top, completable inline

---

### 🔗 Connection System

- Draw connections by hovering a node edge to reveal **connection ports** (small dots on sides)
- Drag from port to port to create a **bezier arrow**
- Connections stay attached when nodes are moved
- Click a connection to select it and edit: color, thickness, style, label, arrowhead
- Delete connections with backspace/delete key
- Connections can be **labeled** (double-click label to edit)
- Connection routing options: straight, curved, elbow/orthogonal

---

### 🛠️ Toolbar & Tools Panel

**Left-side floating toolbar with:**

- Select / Move tool (V)
- Hand / Pan tool (H)
- Text tool (T) — click canvas to place text card
- Sticky note tool (S)
- Shape tools dropdown (R for rect, O for circle, D for diamond)
- Arrow/Connector tool (A)
- Pen/Draw tool (P)
- Frame/Section tool (F)
- Number badge tool (N)
- Image upload button
- Checklist card tool

**Top toolbar / properties panel (context-sensitive):**

- Appears when a node is selected
- Shows relevant properties for that node type (font, color, size, border, opacity, lock, etc.)
- Group/Ungroup selected nodes
- Align tools: left, center, right, top, middle, bottom
- Distribute evenly: horizontal, vertical

---

### 🔍 Search & Filter

- **Global search** (Ctrl+F) that highlights matching nodes on canvas
- Filter visible nodes by type, color label, or keyword
- "Focus mode" — dim everything except selected/matching nodes

---

### ⏰ Reminder System

- Any node or board can have **a reminder attached**
- Set a date + time + message for the reminder
- Reminders list panel (clock icon in sidebar)
- Reminders show as a **badge** on the node
- On load, check for overdue/upcoming reminders and show a **toast notification banner** at top
- Mark reminders as done or snooze (+1 hour, +1 day)
- Use `localStorage` and `Date` comparison on app load to surface due reminders

---

### 💾 Save / Export System

- **Auto-save** every 30 seconds with a subtle "Saved" indicator
- **Manual save** (Ctrl+S)
- **Export board as JSON** (download file)
- **Import board from JSON** (upload file)
- **Export as PNG screenshot** of the current viewport using `html2canvas` or equivalent
- **Duplicate board** to start a new version

---

### ⌨️ Keyboard Shortcuts

Full shortcut panel (press `?` to open):

- `V` — Select, `H` — Pan, `T` — Text, `A` — Arrow, `P` — Pen, `S` — Sticky, `R` — Rect, `F` — Frame
- `Ctrl+Z` / `Ctrl+Y` — Undo/Redo (full history stack, min 50 steps)
- `Ctrl+A` — Select all
- `Ctrl+G` — Group, `Ctrl+Shift+G` — Ungroup
- `Ctrl+D` — Duplicate selection
- `Del / Backspace` — Delete selected
- `Ctrl+C / V` — Copy/paste
- `Escape` — Deselect / cancel tool
- `Ctrl++ / -` — Zoom in/out, `Ctrl+0` — Fit to screen, `Ctrl+1` — 100% zoom
- `Space+drag` — Pan canvas

---

### 🧱 Technical Implementation Notes

- Use **React with hooks** (`useState`, `useRef`, `useEffect`, `useCallback`, `useReducer`)
- Canvas rendering via **absolute-positioned DOM nodes** inside a transformed container div (not WebGL/canvas element) for full HTML richness
- Use a `transform: scale() translate()` matrix on the canvas container for zoom/pan
- All state in a `useReducer` with an undo history stack
- Persist to `localStorage` on every state change (debounced 500ms)
- Use **Tailwind utility classes** for all styling
- Import Google Fonts via `<link>` in the head
- Use `lucide-react` for all icons
- Color picker implemented as a small popover with preset swatches + hex input
- Tooltip on every toolbar button (hover delay 600ms)

---

### 🌟 Polish Details

- **Drag ghost**: semi-transparent clone follows cursor while dragging a node
- **Snap to grid**: optional, toggleable, 20px grid
- **Smart guides**: show alignment guides when dragging near other nodes
- **Selection box**: rubber-band lasso selection with a blue translucent rectangle
- **Context menu**: right-click any node for quick actions
- **Node spotlight**: double-click empty canvas to quick-add a text node
- **Empty state**: beautiful illustrated prompt when a board is empty ("Your canvas is blank. Start with a thought...")
- **Loading skeleton**: smooth fade-in on board load
- Smooth `cubic-bezier` transitions on all zoom/pan operations

---

Use this prompt to generate the most complete, functional, and beautiful infinite canvas app possible — everything should work end-to-end in a single artifact, with no missing features or placeholder stubs. Every button should do something. Every tool should be usable.

---

This prompt covers every dimension of what you need — paste it directly into a new Claude conversation and it will build the whole thing as a live, interactive artifact you can use immediately in your browser, with full persistence so your boards are saved between sessions.
