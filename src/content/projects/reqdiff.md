---
title: reqdiff
summary: A Python linting tool that catches unused dependencies and undeclared imports across requirements files.
tags: [Python, CLI, open-source]
status: finished
order: 4
liveUrl: https://pypi.org/project/reqdiff/
---

## Problem

Python projects accumulate dependency drift over time — packages that were added
early but are no longer used, or imports that crept in without ever being
declared. Both cause real problems: bloated environments, security surface area,
and CI failures that are hard to trace.

The existing tools I found either required heavy configuration or weren't
accurate enough to trust in a pipeline.

## Approach

I built `reqdiff` as a focused linter: point it at a project, and it tells you
exactly what's out of sync between your code and your requirements. It supports
`requirements.txt`, `pyproject.toml`, and `setup.cfg`, and outputs clean
JSON for easy integration into CI/CD pipelines.

```bash
pip install reqdiff
reqdiff .
```

Exit codes are explicit: `0` for clean, `1` for issues found, `2` for scan
error — so it integrates predictably into automated workflows.

## Trade-offs

- Static analysis means dynamic imports via `importlib` are not detected
- Falls back to treating the import name as the package name for uninstalled packages
- Chose focused scope over broad configuration — does one thing well

## Reflection

reqdiff started as a script I kept copying between projects. Packaging it forced
me to think about the edge cases I'd been quietly ignoring, and publishing it to
PyPI made the scope constraints feel real. Keeping it small and opinionated was
the right call.
