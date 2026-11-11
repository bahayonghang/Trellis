# First hosted CI: unreachable marketplace gitlink

## Observed result

The user explicitly approved dev publication and the fork-local draft PR.
dev was pushed normally to origin at
`9b8df9a6aec07053bd9dc030e985036ed776c481`.
Draft PR: https://github.com/bahayonghang/Trellis/pull/1 (base main).

PR run: https://github.com/bahayonghang/Trellis/actions/runs/43022012893
Event: pull_request. API source head:9b8df9a6.
Actual checkout: synthetic PR merge
`4cc8e0baca8dd54b16b7ba2999f64264a9470539`.

All four jobs failed at Checkout, before Node/Python setup or any test:

| Job                 | ID           | Result           |
| ------------------- | ------------ | ---------------- |
| Ubuntu / Node26.7   | 130527257177 | Checkout failure |
| Ubuntu / Node18.17  | 130527257553 | Checkout failure |
| Windows / Node26.7  | 130527257659 | Checkout failure |
| Windows / Node18.17 | 130527257507 | Checkout failure |

Linux and Windows logs both contain:

```text
fatal: remote error: upload-pack: not our ref 1aa9b326baf93257d6142660e49d3120e7f4b4ef
fatal: Fetched in submodule path 'marketplace', but it did not contain 1aa9b326baf93257d6142660e49d3120e7f4b4ef. Direct fetching of that commit failed.
```

This is a checkout/input-distribution failure. No replay, doctor, full suite,
CLI smoke or Python check ran; none can be counted as passing or product-failing.

## Root cause

`.gitmodules` points marketplace at mindfold-ai/marketplace. The main gitlink
points at local commit1aa9b32, which that remote cannot supply. The local
submodule is clean/detached with origin still mindfold-ai/marketplace. Its
parent7d5298d is advertised on the upstream docs/mem-recall-devin-stable branch;
there is exactly one extra local commit. That commit changes only four lines
of workflows/native/workflow.md, matching the accepted create-only active-task
preservation documentation. It entered the main gitlink in cb895dba.

The local presence of a matching gitlink/worktree was insufficient publication
preflight: remote reachability was not verified before the first push. Actual
hosted checkout now provides the missing evidence. Merely matching local SHA
or listing ref names cannot prove arbitrary commit reachability.

Authenticated read of bahayonghang/marketplace returned404. No existing fork
at that name was available to this identity. No submodule push, fork creation,
remote setting edit or `.gitmodules` change has been performed.

## Concrete proposed repair (requires expanded authorization)

Create the public personal fork bahayonghang/marketplace, publish the existing
1aa9b32 unchanged on its trellis-reliability-v1 branch, then change exactly
one `.gitmodules` URL:

```diff
-	url = https://github.com/mindfold-ai/marketplace.git
+	url = https://github.com/bahayonghang/marketplace.git
```

The gitlink SHA and marketplace contents remain identical. Proposed commands:

```text
gh repo fork mindfold-ai/marketplace --clone=false --remote=false
git -C marketplace -c push.followTags=false push https://github.com/bahayonghang/marketplace.git 1aa9b326baf93257d6142660e49d3120e7f4b4ef:refs/heads/trellis-reliability-v1
```

Use the explicit fork URL without changing local remote configuration. Verify
the published branch SHA and an actual fresh fetch of the exact commit before
committing the URL repair. Inspect staged detect_changes, run the normal full
commit gate, and push only Trellis dev. Then require a fresh actual PR CI run.
This extends the earlier authorization beyond one repository/branch and the
handoff's file boundary, so approval is requested before those writes.

Skipping recursive submodules, using a different snapshot, reverting accepted
task behavior, modifying deadlines/skips or writing to upstream would not
validate the intended checkout. No such workaround was applied. All three
children and the planning parent remain unarchived.

## Additional local consistency check

The committed main-repo CLI workflow and committed marketplace workflow are
byte-identical (SHA256 fce4d1239167c71f257f99e773ea64b22620f929eea2229e4aae8231f1167622).
Raw working-file comparison initially failed because marketplace contains721
CRLF pairs and the CLI source is LF. Normalized working text and exact Git
blobs both match; this is not a content mismatch or a reason to rewrite either.
The proposed repair preserves the accepted source input.
