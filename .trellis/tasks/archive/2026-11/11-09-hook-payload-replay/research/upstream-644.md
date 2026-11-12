# Selective review of upstream #644

Reviewed the actual pull-request diff on 2026-11-11 through the GitHub connector.
PR: https://github.com/mindfold-ai/Trellis/pull/644 (open at review time).
Base: `f089cb3286071199e84118dee86b6d76aab032f1`.
Head: `0d6e843a0ca52af531585c2f4c1e547c509c9592`.

Only two files are added: `.github/workflows/hookcompat.yml` and
`hookcompat.yml`. The workflow materializes the shipped Claude hook/settings,
then invokes `k21993/hookcompat@2c0891c4cfae44f576c8dc564cbd164981b2326a`
(v0.1.0) on Ubuntu. The YAML selects the research-subagent scenario and expects
allow. The PR description explicitly says updatedInput is not validated.
It names recorded Claude versions 2.1.62, 2.1.63 and 2.1.286 and the Task to
Agent tool-name change in 2.1.63; fixture contents/provenance must still be
inspected at the pinned source before use.

Selectively retain versioned, credential-free replay and the Task/Agent
compatibility case. Use this repository's existing Vitest/Windows+Ubuntu matrix
and assert actual task/spec content. Do not import the external action or the
allow-only oracle. Codex must be added from independently identified provenance;
the task5 output receipt is not a raw payload capture. Attribution belongs in
the source commit as `Ported from mindfold-ai/Trellis#644`.
