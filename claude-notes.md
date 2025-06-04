# Claude Code Session Notes

## Session Context
- **Starting commit:** c0aebc0 Initial commit
- **Current step:** App initialization (Step 1: Requirements Gathering)
- **Status:** In progress

## Current Task: Application Initialization
Working through the project:init-app command to help user set up their new application from this template.

### App Requirements: 2D Online Tag Game
**Core Concept:** Two-player online tag game where players control circles with mouse movement
- **"It" player:** Starts at random edge position, tries to catch runner
- **Runner player:** Starts in center, tries to avoid being caught
- **Game area:** Circular boundary constraining movement
- **Win condition:** Game ends when "it" touches runner
- **Features:** Real-time multiplayer, timer, collision detection

### Progress:
- ✅ Created initialization todos
- ✅ Starting claude-notes.md documentation
- ✅ Gathered requirements from user

### MVP Implementation Plan:
1. ✅ Set up Convex schema for games and players  
2. Create game canvas with basic circle rendering
3. Implement mouse movement and boundary constraints
4. Add collision detection
5. Build multiplayer synchronization
6. Add timer and game flow
7. Polish UX and responsive design

### Current Status: Basic game implementation complete, ready for testing

### Session Commits:
- f2f9cfb: init: document 2D tag game requirements and remove template instructions

## Important Notes:
- Template includes: React + Vite + TanStack Router (frontend), Convex (backend), Clerk (auth)
- If starting from fresh session, reread project:init-app command file for context
- User should describe their app idea clearly before proceeding to implementation

## Session Commits:
- (Will be updated as we make progress)