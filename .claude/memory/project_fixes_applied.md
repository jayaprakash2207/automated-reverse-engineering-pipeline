---
name: project-fixes-applied
description: "All critical bugs already fixed in this project — do not revert, these solve real blocking issues discovered during initial run"
metadata: 
  node_type: memory
  type: project
  originSessionId: a3039413-7d27-401e-923b-671551c92de9
---

# Critical Fixes Applied

All fixes were discovered and applied during the 2026-07-27 session. Do NOT revert any of these.

---

## Fix 1 — Portable JDK/Maven resolver (no admin rights)
**File:** `forward-engineering-only/pipeline_forward/test_executor_runner.py`
**Lines:** Top of file, `_PORTABLE_JAVA`, `_PORTABLE_MAVEN`, `_tool()` function

**Problem:** `shutil.which("mvn")` and `shutil.which("java")` return None on machines where Java/Maven are not installed system-wide. `subprocess.run(["mvn", ...])` then raises `WinError 2` (file not found).

**Fix applied:**
```python
_PORTABLE_JAVA  = Path(os.environ.get("JAVA_HOME",  r"C:\tools\jdk21\jdk-21.0.11+10"))
_PORTABLE_MAVEN = Path(os.environ.get("MAVEN_HOME", r"C:\tools\apache-maven-3.9.6"))

def _tool(name: str) -> str:
    found = shutil.which(name)
    if found:
        return found
    if name in ("java",) and Path(_JAVA_EXE).exists():
        return _JAVA_EXE
    if name in ("mvn", "mvn.cmd") and Path(_MVN_BAT).exists():
        return _MVN_BAT
    return name
```
Also injects `JAVA_HOME` into `sub_env` passed to all `subprocess.run()` calls.

**Portable tool locations:**
- JDK: `C:\tools\jdk21\jdk-21.0.11+10` — download from https://adoptium.net (portable zip, no installer)
- Maven: `C:\tools\apache-maven-3.9.6` — download from https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/

**Note:** Maven 3.9.9 and 3.9.10 URLs on dlcdn.apache.org returned 404. Use 3.9.6 from archive.apache.org.

**How to apply:** Set `JAVA_HOME` and `MAVEN_HOME` env vars before running Batch 2. The `_tool()` resolver handles the rest automatically.

---

## Fix 2 — Single Jest config file (no duplicates)
**File:** `forward_results/new_app/frontend/jest.config.cjs`

**Problem:** AI code generation produced 3 conflicting jest config files simultaneously:
- `jest.config.js` (ESM syntax)
- `jest.config.ts` (TypeScript)
- `jest.config.cjs` (CommonJS)
Jest picks unpredictably between them causing test failures and config conflicts.

**Fix applied:** Delete `jest.config.js` and `jest.config.ts` — keep only `jest.config.cjs`.

Final `jest.config.cjs` content:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleNameMapper: { '\\.(css|less|scss)$': '<rootDir>/jest.styleMock.cjs' },
  globals: { 'ts-jest': { tsconfig: { module: 'CommonJS', target: 'ES2020' }, diagnostics: false } },
  setupFiles: ['<rootDir>/jest.importMetaSetup.cjs'],
};
```

**How to apply:** After each sprint generates frontend files, check for duplicate jest config files. Delete .js and .ts versions if present.

---

## Fix 3 — import.meta SyntaxError in Jest
**Files:**
- `forward_results/new_app/frontend/src/shared/api/httpClient.ts`
- `forward_results/new_app/frontend/jest.importMetaSetup.cjs` (new file created)
- `forward_results/new_app/frontend/jest.config.cjs` (diagnostics: false)

**Problem:** Vite uses ESM — `import.meta.env.VITE_API_BASE_URL` is valid Vite syntax. Jest runs in CommonJS and cannot parse `import.meta` — throws `SyntaxError: Cannot use 'import.meta' outside a module`.

**Fix applied in httpClient.ts:**
```typescript
const API_BASE_URL: string =
  (globalThis as any).__VITE_API_BASE_URL__ ??
  (typeof process !== 'undefined' ? process.env['VITE_API_BASE_URL'] : undefined) ??
  '';
```

**Fix applied — new file jest.importMetaSetup.cjs:**
```javascript
if (typeof globalThis.importMeta === 'undefined') {
  Object.defineProperty(globalThis, 'importMeta', { value: { env: {} } });
}
```

**Fix applied in jest.config.cjs:** `diagnostics: false` in ts-jest globals suppresses remaining import.meta TypeScript errors.

**How to apply:** Any generated file using `import.meta.env.*` must be replaced with the process.env fallback pattern above.

---

## Fix 4 — App.tsx default export
**File:** `forward_results/new_app/frontend/src/App.tsx`

**Problem:** AI generated `export function App()` (named export) but e2e test does `import App from "../../App"` (default import). TypeScript error: does not provide an export named 'default'.

**Fix applied:** Changed to `export default function App()`

**How to apply:** If e2e tests fail with "does not provide an export named 'default'" on App, add `default` keyword to the App function declaration.

---

## Fix 5 — Code fence artifacts in source files
**Affects:** ~24 frontend TypeScript source files

**Problem:** AI code generation left markdown code fence markers in actual source files:
- Line 1: ` ```typescript ` or ` ```tsx `
- Last line: ` ``` `
These cause TypeScript/Jest parse errors.

**Fix applied:** Python strip script — removes first line if it matches ` ```[language] ` and last line if it's ` ``` `.

**How to apply:** After each sprint, run:
```python
import glob, os
for f in glob.glob('forward_results/new_app/**/*.ts', recursive=True) + \
         glob.glob('forward_results/new_app/**/*.tsx', recursive=True):
    lines = open(f, encoding='utf-8').readlines()
    if lines and lines[0].strip().startswith('```'):
        lines = lines[1:]
    if lines and lines[-1].strip() == '```':
        lines = lines[:-1]
    open(f, 'w', encoding='utf-8').writelines(lines)
```

---

## Fix 6 — `=== END FILE ===` artifacts
**Affects:** 5 files across backend and frontend

**Problem:** AI used `=== END FILE ===` as a file boundary marker but it leaked into actual file content, causing Java/TypeScript parse errors.

**Files affected:**
- `backend/.../AuditControllerIntegrationTest.java`
- `backend/.../AuditEntryDtoTest.java`
- `frontend/.../auditLogApi.test.ts`
- `frontend/.../AuditLog.e2e.test.tsx`
- `backend/.../V1.5__create_leave_requests.sql`

**Fix applied:** Strip all occurrences with `str.replace('=== END FILE ===', '')`.

**How to apply:** After each sprint, grep for `=== END FILE ===` in generated files and strip.

---

## Fix 7 — Orphan audit test folders
**Deleted folders:**
- `frontend/src/api/`
- `frontend/src/components/audit/`
- `frontend/src/features/auditLog/`
- `frontend/src/features/audit/`

**Problem:** AI generated test files in these folders referencing source files that don't exist (different folder structure, axios-based imports). Tests all failed with module-not-found errors.

**Fix applied:** Deleted all 4 folders entirely.

**How to apply:** After audit sprint runs, if tests fail with module-not-found in `src/api/` or `src/components/audit/` paths, those are orphan folders — delete them.

---

## Fix 8 — Missing npm packages
**Problem:** Generated code imported packages not in package.json.

**Packages added:**
```
npm install axios
npm install @testing-library/user-event
```

**How to apply:** If `npm test` fails with "Cannot find module 'axios'" or similar, add the missing package to `frontend/package.json` and re-run `npm install`.

---

## Fix 9 — Stale node_modules from another machine
**Problem:** `node_modules/` from a different machine had `esbuild.exe` missing (ENOENT). Old binaries incompatible with current machine.

**Fix applied:** Deleted `frontend/node_modules/` entirely and ran fresh `npm install`.

**How to apply:** If `npm test` fails with `esbuild ENOENT` or similar binary errors, delete node_modules and re-run npm install.

---

**Why:** These 9 fixes blocked Sprint 1 and Sprint 2 from running (FAILED_BLOCKED). Knowing them upfront prevents wasting fix-loop tokens re-investigating the same root causes.
**How to apply:** Before starting any sprint troubleshooting, run through this checklist first.
