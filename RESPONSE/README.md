# Phase 0 + Phase 1: Security fixes and schema consolidation

## What's here

```
001_consolidated_schema.sql                          new schema, full Prisma replacement, user_id on everything
backend/internal/auth/middleware.go                   RequireAuth, no dev_user bypass in production
backend/internal/db/scoped.go                          RequireOwner, the ownership check used everywhere
backend/internal/handlers/validation.go                 email/enum/length validation helpers
backend/internal/handlers/projects.go                    rewritten, GetProject now ownership-checked
backend/internal/handlers/tasks.go                        rewritten, StartTimer no longer global, today filter fixed
backend/internal/handlers/goals.go                          rewritten, toggle/delete/update all ownership-checked
backend/internal/handlers/canvas.go                          rewritten, every path ownership-checked + size cap
backend/internal/handlers/clients.go                          update/delete added, they didn't exist before
backend/internal/handlers/leads.go                              convert-to-client ownership bug fixed
backend/internal/handlers/trpc_router_PATCH_NOTES.md              manual patch, see below for why
```

`habits.go` (Pillar/HabitTemplate/HabitLog) isn't included as a full rewrite here since
the audit didn't describe its specific query bugs in detail, but it should get the exact
same treatment: `RequireOwner` before any read/update/delete, `user_id = $1` as the only
filter on lists, no `OR true` anywhere. The pattern in `goals.go` is the template to copy.

## What I don't have

I don't have your actual Go source files, only what the audit document described. So
this is a correct reference implementation of the pattern each handler needs, not a
drop-in replacement guaranteed to compile against your exact existing types, helper
functions, or import paths. Before merging:

1. Check the module path. I used `anchor/internal/...` as the import prefix, swap it for
   whatever your `go.mod` actually declares.
2. Check `VerifyRequest`'s real signature in your `clerk.go`. I assumed it returns
   `(string, error)`. If it currently returns just a string (with empty string meaning
   "unverified"), adjust `middleware.go` accordingly.
3. Any field your frontend already depends on that isn't in these rewritten handlers
   (there are almost certainly more fields on tasks/projects/clients than the audit
   listed) needs to be added back in. I kept these focused on the fields the audit
   specifically mentioned rather than guessing at your full field list.
4. Run the sanity check query at the bottom of `001_consolidated_schema.sql` after
   porting real data over, to confirm nothing landed without an owner.

## Suggested order to apply this

1. Run `001_consolidated_schema.sql` against a copy of the database first, not
   production directly.
2. Write and run the one-time data migration script copying rows out of the old
   PascalCase Prisma tables into the new ones, backfilling `user_id` from whatever the
   old ownership column was (this script isn't included here since it depends on
   exactly what's in your production data right now, happy to write it once I know the
   row counts and whether there's more than one real user's data mixed in).
3. Drop in `middleware.go` and `scoped.go`, they have no dependencies on the rest.
4. Replace `projects.go`, `tasks.go`, `goals.go`, `canvas.go`, `clients.go`, `leads.go`
   one at a time, compiling after each so errors stay isolated to the file you just
   touched.
5. Apply the two manual edits in `trpc_router_PATCH_NOTES.md`.
6. Port `habits.go` and the `Notification` handlers using the same pattern, they weren't
   included as full rewrites here since the audit didn't detail their specific bugs.
7. Delete `EnsureGoalsTable` and any call to it, it's no longer needed once `goals` is a
   real migrated table.

Once this is merged and deployed, that's Phase 0 and Phase 1 done. Phase 2 (the
`activity_events` table, ingestion endpoint, and the Electron SQLite buffer) is the next
piece, and it's a clean addition on top of this rather than another round of fixing
existing code, so it should move faster.
