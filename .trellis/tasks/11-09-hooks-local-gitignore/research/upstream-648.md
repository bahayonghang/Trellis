# Selective port review: mindfold-ai/Trellis#648

Reviewed the unified diff using the GitHub connector on 2026-11-10, before
implementation. Source: https://github.com/mindfold-ai/Trellis/pull/648/files

The diff adds hooks.local.json to template and dogfood, merges all missing
positive defaults on update, preserves BOM/newlines/user rules, transforms
directory rules to preserve negations, skips Python rewriting for gitignore,
and guards symlink/nonregular paths. It also adds integration regressions.

Selected: template/dogfood rule, additive byte-preservation, user negation
precedence, pre-read skip checks, symlink/nonregular guards, exact safe-merge
classification and regression concepts. Extend to init and tracked-file advice
as required by the fork PRD.

Not selected: general all-default restoration/directory-glob traversal engine,
unrelated formatting changes and new Windows symlink test skips. Only the local
hooks rule is needed; preserving every other existing rule byte avoids that
additional policy surface. Commit attribution must name #648.
