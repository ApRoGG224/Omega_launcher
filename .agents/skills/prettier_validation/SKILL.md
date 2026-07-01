---
name: prettier-validation
description: Automates code formatting and correctness checks using Prettier for TypeScript files.
---

# Prettier Validation Skill

This skill ensures that all TypeScript code in the Omega Launcher project adheres to a consistent style and is free of basic formatting errors before committing.

## Context
The project uses TypeScript for both frontend and backend. Optimization and clean code are top priorities.

## Workflow Instructions
Whenever you finish implementing or modifying TypeScript code, you MUST perform the following checks before the self-verification and commit stages:

1. **Check formatting:**
   Run `npx prettier --check .` (or target specific source directories).
2. **Fix formatting:**
   If the check fails or code needs alignment, automatically run `npx prettier --write .` to fix the issues.
3. **Self-Update:**
   Once a formal `package.json` with Prettier scripts (e.g., `npm run format`) and a `.prettierrc` configuration file are added to the project, you MUST automatically rewrite this skill to use the project's local configuration and scripts instead of generic `npx` commands.

Always ensure the code syntax and structure remain intact and optimal after formatting.
