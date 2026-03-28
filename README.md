# TheraHero

**TheraHero** is an interactive web-based **Rehabilitation Training Suite**. Built using the robust [Phaser 3](https://phaser.io/) HTML5 game framework and integrated with [Firebase](https://firebase.google.com/) for user authentication and data storage, it offers a collection of specialized mini-games tailored for therapeutic exercises, cognitive training, and motor skill development.

## 🎮 Training Modules (Mini-games)

TheraHero features several specialized training modules, each targeting different rehabilitation goals:

- **🎈 Pop the Balloon! (Reaction Training)** - Focuses on improving reaction times and quick decision-making. (ReactionScene)
- **🖐 Four Finger Rush (Motor Skills)** - Designed to train multi-finger coordination and hand dexterity. (FourFingerScene)
- **〰️ Trace the Path (Precision & Control)** - Helps improve fine motor control and tracing accuracy along complex paths. (TracePathScene)
- **🎨 Color Sort (Cognitive & Recognition)** - Exercises color recognition, categorization, and cognitive processing. (ColorSortScene)

## 🏗️ Project Architecture

The project is structured clearly into distinct modular components for maintainability:

```text
TheraHero/
├── index.html        # Main entry point importing Phaser and Firebase scripts
├── main.js           # Phaser game configuration and initialization
├── README.md         # Project documentation
├── assets/           # Game graphics, audio, and visual assets
├── components/       # Reusable UI components (Button, Panel, Overlay)
├── managers/         # Core system utilities (Audio, Input, UI, Auth, Data, SceneTransitions)
├── scenes/           # All application states and mini-game modules
│   ├── BootScene.js       # Preloads assets and initializes data
│   ├── LoginScene.js      # Handles user authentication flow
│   ├── ProfileScene.js    # User profiles and progress tracking
│   ├── MenuScene.js       # Main hub for selecting rehabilitation games
│   └── ... (Mini-game scenes)
└── utils/            # Shared helper functions and global utilities
```

## 🛠️ Technology Stack

- **Game Engine:** [Phaser 3.60.0](https://phaser.io/) - Used for all rendering, physics, and interactions.
- **Backend Services:** Firebase Compatibility Libraries (Auth, Firestore).
- **Styling/Fonts:** Vanilla CSS within `index.html` featuring Google Fonts (`Poppins`).
- **Language:** JavaScript (ES6 Classes).

## 🚀 Getting Started

Since TheraHero is a client-side JavaScript application, you can run it directly using any local web server.

1. Clone or download the repository.
2. Serve the `TheraHero` directory using a local HTTP server. For example:
   - **VS Code:** Use the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension.
   - **Python 3:** Run `python -m http.server 8000` in your terminal.
   - **Node.js:** Run `npx serve` or `npx http-server`.
3. Open a web browser and navigate to `http://localhost:8000` (or whichever port your server uses) to start training.
