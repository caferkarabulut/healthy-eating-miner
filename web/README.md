# Bite Routine web

The home page is a public, Turkish-language food catalog backed by the current .NET/PostgreSQL API. It shows source-linked approximate values per 100 g. Select a food and enter grams to preview kcal and macros using `grams / 100`; missing nutrient values stay marked as unavailable. The preview does not save a meal. The older login, dashboard, profile and coaching pages still expect the previous Python API at `localhost:8000`; they are not part of the current .NET demo.

With PostgreSQL migrated and seeded and the .NET API running on `http://127.0.0.1:5080` (see [repository setup](../README.md)):

```bash
npm ci
npm run dev -- --hostname 127.0.0.1
```

Open http://127.0.0.1:3000. For a different API address, set the **server-side** `BITE_ROUTINE_API_URL` environment variable before starting Next.js. The page is server-rendered so local browser CORS configuration is not needed.

`npm run test` checks portion parsing, calculation and missing values. `npm run build` creates a production Next.js server build. Static export is no longer used because catalog search and API data are resolved at request time. No web deployment is configured in this change.
