# Omega Launcher - Project Context & Agent Rules

## Project Description (MVP)
Omega Launcher is a highly optimized, lightweight Minecraft launcher focused on low resource consumption and maximum performance. 

**Current Tech Stack:**
- **Frontend:** TypeScript
- **Backend:** TypeScript (via Node.js Sidecar), wrapped in Tauri for native OS webview optimization.

**Target Platforms:**
1. Linux (Primary development platform, highest priority)
2. macOS
3. Windows

**Core Features (MVP & Beyond):**
- System for friends and user registration.
- Modrinth API integration for easy mod management.
- Comprehensive modloader support: Forge, Fabric, NeoForge.
- Automatic installation of Minecraft versions and dependencies.
- High focus on automation within the launcher.

*Note for Agent: This section must be continuously expanded, refined, and rewritten as the project evolves. Features expand gradually, so always clarify with the user what to implement next.*

## Core Agent Workflow
When working on tasks for this repository, the agent MUST follow this strict sequence:
1. **Context & Alignment:** Read the entire relevant project structure, active skills, and memory documentation (in English). **ALWAYS** ask the user what they want to do next and clarify their vision before starting a new feature.
2. **Skill Review:** Check available skills in `.agents/skills` to leverage existing knowledge.
3. **Implementation:** Write the necessary code in TypeScript, strictly adhering to the goals of high optimization and low resource usage.
4. **Self-Verification (Correctness):** Verify the implementation against the original task requirements. Use available validation skills (e.g., Prettier).
5. **Self-Verification (Errors):** Check for potential errors, syntax issues, or logical flaws.
6. **Commit:** Always automatically commit the verified changes with a descriptive message.
7. **Push:** ONLY push changes to the remote repository after receiving explicit approval from the user.

## Continuous Learning & Absolute Automation
- **Proactive Memory Updates:** The agent MUST automatically and constantly update this `AGENTS.md` file to reflect new project decisions, architecture, and current state.
- **Proactive Skill Creation:** The agent MUST automatically create, rewrite, and update skills in the `.agents/skills/` directory as it learns from its own usage and solves problems, without waiting for explicit user commands.

## Mentorship Mode
- **The User is a Beginner:** The user has explicitly stated they are learning to code.
- **Teaching Style:** Do not just write code silently. Explain *how* and *why* things work. Break down complex concepts into simple analogies.
- **Step-by-Step:** Guide the user through the process. Encourage them to ask questions and experiment.

## Coding Standards
- **Comments:** NEVER write comments in the code unless absolutely necessary for highly complex logic. If a comment is required, it MUST be written in English. Never write comments in Russian.
