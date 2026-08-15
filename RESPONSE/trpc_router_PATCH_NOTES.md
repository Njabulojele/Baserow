# Patch notes for trpc_router.go

This one isn't a full rewrite since I don't have your actual `HandleTRPCBatch` and
`parseBatchInputs` source, only the audit's description of them. Two changes to make
directly in that file:

## 1. Wrap the handler with RequireAuth

Wherever `HandleTRPCBatch` is registered on your router (probably in `main.go` or a
routes file):

```go
// before
mux.HandleFunc("/api/trpc/", HandleTRPCBatch)

// after
mux.HandleFunc("/api/trpc/", auth.RequireAuth(HandleTRPCBatch))
```

Inside `HandleTRPCBatch`, every call site that currently does something like:

```go
userID := getUserIDSomehow(r) // or the dev_user fallback
```

should become:

```go
userID := auth.UserIDFromContext(r.Context())
```

Since `RequireAuth` already put a verified id in the context before this handler ever
runs, there's no need for a fallback inside the batch handler itself, and no path left
where `userID` can end up empty or client-controlled.

## 2. Body size limit in parseBatchInputs

Wherever `json.NewDecoder(r.Body).Decode(&body)` currently is:

```go
// before
json.NewDecoder(r.Body).Decode(&body)

// after
r.Body = http.MaxBytesReader(w, r.Body, 2<<20) // 2MB, adjust if canvas boardData batches need more
if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
    http.Error(w, `{"error":"request too large or malformed"}`, http.StatusBadRequest)
    return
}
```

Since canvas board saves can legitimately be large JSON payloads, if `UpdateCanvas`
mutations route through this same batch endpoint you may want a higher limit here (say
5MB) and rely on the `maxBoardDataBytes` check inside `canvas.go` as the more precise
per-field guard, rather than making the global body limit itself very large.

## 3. dispatchProcedure signature

Every handler function in this patch set (`GetProject`, `CreateTask`, etc.) has the
signature `func(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{})
(interface{}, error)`. If your current `dispatchProcedure` switch statement calls
handlers with a different signature (e.g. passing `userID` as a separate argument
instead of pulling it from context), either update the switch to match this signature,
or add `userID := auth.UserIDFromContext(ctx)` at the top of each handler and drop the
separate parameter, whichever is a smaller diff against your actual router code. Since I
don't have that file, I'd rather flag the seam clearly than guess at it and hand you
code that silently doesn't compile against your real router.
