# Forward Engineering Pipeline (standalone)

This is the forward-engineering half only, extracted from `updated-fwd-new-arc-main`.
The reverse-engineering pipeline (source extraction, BA/DA/TA/AA agents, Enterprise
Knowledge Graph) is intentionally **not** included here — it lives in a separate
dedicated reverse-engineering codebase.

## What this does

Takes a confirmed (or to-be-confirmed) target stack plus a set of architecture
documents, and builds a real, working application from them: stack selection →
requirements elaboration → stack mapping → project scaffold → sprint planning
(Batch 1), then per-sprint backend/security/frontend development with tests and
independent review (Batch 2).

## Input contract — read this before running

`run_forward.py --input <dir>` expects `<dir>` to contain a `ForwardEngineering_Docs/`
folder (files named `01_BRD.md` … `20_UI_UX_SPECIFICATION.md`) and/or a
`Foundation_KnowledgeGraph/` folder, produced by the reverse-engineering pipeline.
See `pipeline_forward/fwd_base.py` — `has_reverse_engineering_docs()` and
`load_reverse_engineering_docs()` — for the exact shape expected.

**If your separate reverse-engineering codebase does not produce this exact shape**,
you have two options:
1. Adapt `has_reverse_engineering_docs()` / `load_reverse_engineering_docs()` in
   `pipeline_forward/fwd_base.py` to read your actual output format.
2. Skip legacy docs entirely and drive Batch 1 with `--epic <file>` and/or
   `--ux <file>` instead (see Step 2 — Elaboration — in `run_forward.py`).

This adaptation has not been done yet — the loader still reads the original
pipeline's file-naming convention.

## Structure

```
run_forward.py            Batch 1 orchestrator — stack selection → elaboration →
                           stack mapping → scaffold → sprint planning
run_forward_batch2.py     Batch 2 orchestrator — per-sprint dev/test/review loop
pipeline_forward/         All 8 forward-engineering agents + fwd_base.py helpers
pipeline/base_runner.py   Shared generic Claude-CLI helper (call_claude, save_output,
                           save_json, load_prior_output, output_already_exists) —
                           the one file pipeline_forward/fwd_base.py depends on.
                           No reverse-engineering logic in it.
```

## Requirements

- Python 3.9+
- Node.js 18+ (Claude Code CLI: `npm install -g @anthropic/claude-code`, then `claude login`)
- No third-party Python packages required — every runner here uses only the
  standard library plus the local `call_claude()` subprocess wrapper.

## Usage

```bash
# Batch 1 — setup (stack selection, elaboration, mapping, scaffold, sprint plan)
python run_forward.py --input ./results --output ./forward_results
python run_forward.py --input ./results --output ./forward_results --target-stack "Python, FastAPI, PostgreSQL"
python run_forward.py --input ./results --output ./forward_results --epic ./epic.md --ux ./ux-notes.md

# Batch 2 — per-sprint development cycle (after Batch 1 completes)
python run_forward_batch2.py --input ./results --output ./forward_results
python run_forward_batch2.py --input ./results --output ./forward_results --migrate-data
python run_forward_batch2.py --input ./results --output ./forward_results --max-retries 2
python run_forward_batch2.py --input ./results --output ./forward_results --only "Basket Context"
```

`--input` should point at your reverse-engineering codebase's output directory
(see **Input contract** above).
