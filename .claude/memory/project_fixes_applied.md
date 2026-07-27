---
name: project-fixes-applied
description: "Critical bug fixes already applied to the pipeline — do not revert these, they solve real blocking issues"
metadata: 
  node_type: memory
  type: project
  originSessionId: a3039413-7d27-401e-923b-671551c92de9
---

# Critical Fixes Applied to Pipeline

These fixes were discovered and applied during the 2026-07-27 session. They solve real blocking errors.

## Fix 1 — Portable JDK/Maven (no admin rights)
**File:** `forward-engineering-only/pipeline_forward/test_executor_runner.py`
**Problem:** `WinError 2` — `mvn` and `java` not on system PATH, `shutil.which()` returns None, subprocess crashes.
**Fix:** Added `_tool()` resolver that falls back to `JAVA_HOME` / `MAVEN_HOME` env var paths pointing to portable zip extractions. No admin rights, no installer needed.
**Portable paths:** `C:\tools\jdk21\jdk-21.0.11+10` and `C:\tools\apache-maven-3.9.6`
**How to apply:** Set `JAVA_HOME` and `MAVEN_HOME` env vars before running Batch 2.

## Fix 2 — Jest config (single CJS file)
**File:** `forward_results/new_app/frontend/jest.config.cjs`
**Problem:** AI generated 3 conflicting configs: jest.config.js + jest.config.ts + jest.config.cjs. Jest picks randomly, causes errors.
**Fix:** Delete jest.config.js and jest.config.ts — keep only jest.config.cjs.
**How to apply:** If pipeline regenerates duplicate jest configs, delete the .js and .ts versions.

## Fix 3 — import.meta in Jest
**File:** `forward_results/new_app/frontend/src/shared/api/httpClient.ts`
**Problem:** `import.meta.env.VITE_API_BASE_URL` — Jest is CommonJS, cannot parse `import.meta` syntax. SyntaxError.
**Fix:** Replace with `(globalThis as any).__VITE_API_BASE_URL__ ?? process.env['VITE_API_BASE_URL'] ?? ''`
**Also:** `jest.config.cjs` uses `diagnostics: false` in ts-jest globals + `jest.importMetaSetup.cjs` stubs `globalThis.importMeta`.
**How to apply:** If any generated file uses `import.meta.env.*`, replace with process.env fallback pattern.

## Fix 4 — App.tsx default export
**File:** `forward_results/new_app/frontend/src/App.tsx`
**Problem:** Named export `export function App()` but e2e test does `import App from "../../App"` (default import).
**Fix:** Change to `export default function App()`.
**How to apply:** If e2e tests fail with "does not provide an export named 'default'", add `default` keyword.

## Fix 5 — Code fence artifacts in generated files
**Problem:** 24 frontend source files had ` ```typescript ` on line 1 and ` ``` ` on last line — AI left markdown code fence wrappers in the actual source files.
**Fix:** Python strip script to remove first/last line if they match ` ```[language] ` pattern.
**How to apply:** After each sprint, scan non-test source files for lines starting with ` ``` `. Strip them.

## Fix 6 — `=== END FILE ===` artifacts
**Problem:** 5 files had `=== END FILE ===` as the last line — AI file boundary marker leaked into content.
**Fix:** Strip all occurrences.
**How to apply:** After each sprint, grep for `=== END FILE ===` and strip.

**Why:** These fixes blocked Sprint 1 and Sprint 2 from running at all (FAILED_BLOCKED status). Knowing these prevents wasting fix-loop tokens on known issues.
**How to apply:** When a sprint's test executor crashes or tests all fail, check these patterns first before letting the fix-loop spend tokens.
