# Bite Routine web

The home page is a public, Turkish-language food catalog backed by .NET/PostgreSQL. Its 100 g nutrition values support a gram-based preview without saving a meal. Registration, login and the small account page now use .NET Identity. The old Python dashboard, profile and coaching screens are not migrated in this PR; login no longer redirects to them.

With PostgreSQL migrated and seeded and the .NET API running on `http://127.0.0.1:5080` (see [repository setup](../README.md)):

```bash
npm ci
npm run dev -- --hostname 127.0.0.1
```

Open http://127.0.0.1:3000. For a different API address, set the **server-side** `BITE_ROUTINE_API_URL` environment variable before starting Next.js. The browser sends registration, login and logout only to same-origin `/api/auth/*` routes; Next forwards requests to .NET and sets the Identity session cookie as HttpOnly. `/account` checks `/me` on the server for each request. Cookie-backed POST requests require an Origin check and a matching CSRF header and HttpOnly cookie issued by `GET /api/auth/csrf`. Next also obtains a separate .NET antiforgery token server-to-server before cookie login and logout; direct cookie mutations at the API fail without it. On HTTPS requests, web cookies are marked Secure. The new session flow never stores a token or email in `localStorage` and clears any legacy keys on login/logout. See [network and CSRF boundary](../backend-dotnet/docs/auth-session.md).

`npm run test` checks portion calculations and CSRF/session helpers; `npm run build` and `npm run lint` verify the web app. `npm run smoke:auth` checks the gateway session, direct API rejection and mobile bearer login/refresh over HTTP with real PostgreSQL and the .NET API; it creates a uniquely named test user, so use a disposable test database for automated runs. CI runs this against `bite_routine_test`. Static export is not used. No web deployment is configured in this change.
