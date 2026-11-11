# Local hooks ignore rule

## Scope and upstream review

Reviewed the current diff of mindfold-ai/Trellis#648 before implementation.
It adds the template/dogfood rule and a general additive merge for every default
ignore pattern in update, including directory-negation traversal transforms.
Select only the hooks.local.json rule and byte-preserving/additive safety
principles. This task does not restore unrelated default ignore rules.
Add init handling and tracked-file advice required by this fork's PRD.

## Contract

A small shared helper plans `.trellis/.gitignore` content for init and update.
New files use the bundled template. Existing regular files receive only a
missing positive hooks.local.json rule, prepended after any UTF-8 BOM using the
existing CRLF/LF convention. All existing comment/rule bytes retain order;
later user negations keep precedence. An existing root-anchored equivalent
rule is also sufficient. Repeated planning returns byte-identical content.

Only a real workflow directory and absent/regular ignore file are eligible.
Use lstat, preserve existing/dangling symlinks and nonregular paths, and warn;
never follow an external target for this write. Init must bypass whole-file
conflict replacement for this mixed-ownership file, including force reinit.
The guard applies only to this ignore-file operation: existing support for
symlinked workflow directories (#567) must not become a whole-command refusal.

Update uses the same planned content with its normal backup/confirmation/apply
pipeline. Mark only the exact safe additive result auto-updatable. Honor skip
before reading, dry-run zero writes, and avoid Python-command replacement of
user ignore content. Preserve the existing hash-exclusion contract.

A read-only Git tracked-path probe prints `git rm --cached --
.trellis/hooks.local.json` advice if necessary; it never modifies the index.
An explicit user negation is preserved even though it opts out of ignoring.

## Boundaries and rollback

Expected files: one helper, init/workflow/update wiring as necessary, the
bundled gitignore and confirmed `.trellis/.gitignore` dogfood, focused tests,
update/filesystem contract docs and task artifacts. No general ignore engine,
new dependency, Python change, automatic untracking or unrelated cleanup.
Rollback is this task's single implementation commit; user rules stay intact.
