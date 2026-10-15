# Bite Routine web

The home page is a public, Turkish-language food catalog backed by .NET/PostgreSQL. Signed-in users select grams and a date, then explicitly add a food to their diary. `/diary` lists only that user's entries for the selected day. Registration, login and the account page use .NET Identity. The old Python dashboard, profile and coaching screens are not migrated.

With PostgreSQL migrated and seeded and the .NET API running on `http://127.0.0.1:5080` (see [local setup](../docs/local-setup.md)):

```bash
npm ci
npm run dev -- --hostname 127.0.0.1
```

Open http://127.0.0.1:3000. For a different API address, set the **server-side** `BITE_ROUTINE_API_URL` environment variable before starting Next.js. The browser sends registration, login and logout only to same-origin `/api/auth/*` routes; Next forwards requests to .NET and sets the Identity session cookie as HttpOnly. `/account` checks `/me` on the server for each request. Cookie-backed POST requests require an Origin check and a matching CSRF header and HttpOnly cookie issued by `GET /api/auth/csrf`. Next also obtains a separate .NET antiforgery token server-to-server before cookie login and logout; direct cookie mutations at the API fail without it. On HTTPS requests, web cookies are marked Secure. The new session flow never stores a token or email in `localStorage` and clears any legacy keys on login/logout. See [network and CSRF boundary](../backend-dotnet/docs/auth-session.md).

## Diary behavior

The browser calls only same-origin `GET/POST /api/diary` and `PATCH/DELETE /api/diary/{id}`; Next forwards the Identity cookie to `/me/diary-entries`. POST/PATCH/DELETE verify the browser CSRF token and obtains the API antiforgery pair server-to-server. `GET /api/auth/me` reports session availability without exposing a token or email. Personal gateway responses (including errors) use `Cache-Control: private, no-store` and `Vary: Cookie`; browser/API fetches also use `no-store`.

The default day uses `Europe/Istanbul`, independently of the browser/server's own time zone. An untouched default follows Istanbul midnight while open; a manually selected date stays fixed. `/diary` keeps selected dates in the URL for reloads. Turkish `150,25` becomes JSON number `150.25`; at most two decimal places and 0.01–10000 g are allowed. Missing nutrition stays “Veri yok”; true zero remains zero. Loading, empty days, expired sessions and errors have explicit states. Inputs/buttons are disabled during POST. An uncertain response is never retried automatically; the same payload is blocked with a link to inspect the diary first. Diary cards can edit grams/date or delete with an explicit confirmation. PATCH sends both grams and date; it never changes the original food/nutrition/source snapshots. After success the selected day is fetched again; a moved entry appears on its new day. Mutations lock the controls until completion. Uncertain PATCH/DELETE results stay locked until the user refreshes the diary to inspect the result; there are no automatic retries. Focus refresh is paused while editing so tab switching does not discard the form. Daily totals remain outside this change.

Before using the diary, explicitly apply `AddDiaryEntries` to the project **development** database (`bite_routine`, not `bite_routine_test`); see [backend setup](../backend-dotnet/README.md). The local development DB was migrated with existing users/catalog verified unchanged.

`npm test` checks portions, Istanbul rollover, validation, private GET/POST/PATCH/DELETE gateway forwarding, session errors and single-attempt mutation behavior; `npm run build` and `npm run lint` verify the app. `npm run smoke:auth` checks Identity and diary creation/edit/delete/persistence/day/user isolation, direct API CSRF rejection and bearer sessions over HTTP; it creates two test users and diary records, so use a disposable environment for automated runs. CI migrates/seeds ephemeral `bite_routine_test` for this smoke; it is never the local development backend. Local browser checks use temporary accounts in `bite_routine`, removed after verification. Static export is not used. No deployment is configured.
