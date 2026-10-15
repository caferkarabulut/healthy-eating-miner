# Bite Routine — .NET Backend

> Track Your Food, Build Your Routine.

ASP.NET Core Web API (controllers) for Bite Routine, targeting **.NET 10** (`net10.0`).

## Requirements

- .NET SDK 10.0.402 or a later installed SDK in the same 10.0.4xx feature band.
  `global.json` sets `version: 10.0.402` with `rollForward: latestPatch`, so the CLI
  picks the highest installed 10.0.4xx SDK that is >= 10.0.402. It never rolls
  forward to 10.0.5xx (or later) and never downloads an SDK. Prerelease SDKs are
  not allowed (`allowPrerelease: false`).
- PostgreSQL 17 (the supplied Compose service or a local server) for database tests and the local API.

## Structure

```
backend-dotnet/
├── BiteRoutine.slnx
├── global.json
├── src/BiteRoutine.Api/            # ASP.NET Core Web API
└── tests/BiteRoutine.Api.Tests/    # xUnit integration tests (WebApplicationFactory)
```

## Build & test

Run from the `backend-dotnet/` directory:

```bash
docker compose up -d postgres
dotnet tool restore
dotnet restore BiteRoutine.slnx
dotnet build BiteRoutine.slnx --no-restore --configuration Release
BITE_ROUTINE_TEST_CONNECTION='Host=127.0.0.1;Port=5433;Database=bite_routine_test;Username=bite_routine;Password=local_dev_only' dotnet test BiteRoutine.slnx --no-build --configuration Release
```

`compose.yaml` exposes PostgreSQL only on localhost port 5433. The `bite_routine`
database is for local development; `bite_routine_test` is only for integration
tests. These are local example credentials, not production secrets. The test
database is created by the init script when the Docker volume is first created.
The integration fixture accepts only a connection whose database name is
`bite_routine_test`. Each test run creates a unique schema there, applies
migrations and seeds 25 demo meals in that schema, then removes it. Other data
in the test database and the development database are untouched.

If Docker is unavailable, run PostgreSQL 17 on localhost port 5433 and create
the two databases with the names above. The checked-in example connection
strings use the local `bite_routine` role and `local_dev_only` password.

## Database setup

Apply the checked-in EF Core migrations (catalog and Identity user tables) to the development database:

```bash
ASPNETCORE_ENVIRONMENT=Development dotnet ef database update --project src/BiteRoutine.Api
```

The development connection string is in `appsettings.Development.json`. To add
the small, source-linked starter catalog after migrating, run either:

```bash
# With Compose, from backend-dotnet/
docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U bite_routine -d bite_routine < db/seed-usda-starter.sql

# With a local PostgreSQL 17 installation
psql -h 127.0.0.1 -p 5433 -U bite_routine -d bite_routine -v ON_ERROR_STOP=1 -f db/seed-usda-starter.sql
```

The seed is repeatable: it inserts eight basic foods once, identified by their
USDA FoodData Central IDs, and corrects their source links when re-run. Values are **approximate, per 100 g of edible food**,
and each record links to its source. Preparation is part of the name: plain
cooked rice is not a buttered pilaf, for example. The legacy CSV is not used.

When deploying, set `ConnectionStrings__BiteRoutine` to the managed PostgreSQL
connection string and apply the reviewed migrations as a separate deployment
step. Do not rely on the API to create or migrate a production database.

The meal catalog starts **empty** after migration; the starter seed is a separate,
explicit step. No English demo meals are added to a user-facing database.
Traditional Turkish recipes need their own sourced values and serving rules.

## Continuous integration

GitHub Actions workflow `.github/workflows/dotnet-ci.yml` runs on pull requests
targeting `main` and on pushes to `main` when files under `backend-dotnet/`,
`web/`, or the workflow itself change. On `ubuntu-latest` it installs the SDK from
`global.json`, then runs `dotnet restore`, `dotnet build` (Release), the EF
pending-model check, focused Identity tests and the full `dotnet test` (Release) suite for `BiteRoutine.slnx`. It uses read-only permissions and
an ephemeral PostgreSQL service, but no secrets, caching, publishing or deployment.
The web job uses Node 24 and runs `npm ci`, `npm run test`, `npm run build` and `npm run lint`. The backend job also starts the API and a built web server against the ephemeral `bite_routine_test` database and runs the same-origin auth HTTP smoke test.

## Run locally

```bash
dotnet run --project src/BiteRoutine.Api --no-build --no-launch-profile --urls http://127.0.0.1:5080
```

`--no-launch-profile` only skips `Properties/launchSettings.json`, so the profile's
`ASPNETCORE_ENVIRONMENT=Development` is not applied. With no environment variable
set, ASP.NET Core falls back to its default `Production` environment. The flag
does not prevent Development: set the variable yourself to use Development settings
(e.g. `Debug` logs for `BiteRoutine.Api`):

```bash
ASPNETCORE_ENVIRONMENT=Development dotnet run --project src/BiteRoutine.Api --no-build --no-launch-profile --urls http://127.0.0.1:5080
```

## Endpoints

| Method | Path           | Response                                     |
|--------|----------------|----------------------------------------------|
| GET    | `/health/live` | `200` `{"status":"ok","service":"Bite Routine"}` |
| GET    | `/meals`       | On a new database: `200` `{"items":[],"page":1,"pageSize":20,"totalCount":0}`; eight items after the starter seed |
| GET    | `/meals/{mealId}` | `404` for unknown IDs; `200` with details and optional `nutrition` afterward |
| POST   | `/auth/register` | Creates a PostgreSQL-backed Identity user; requires `email` and `password` |
| POST   | `/auth/login` | Identity bearer access/refresh tokens; `?useCookies=true` selects an HttpOnly cookie |
| POST   | `/auth/refresh` | Renews an Identity bearer session |
| GET    | `/auth/antiforgery` | Issues the API antiforgery cookie and request token for server-side cookie clients |
| POST   | `/auth/logout` | Ends an authenticated Identity cookie session |
| GET    | `/me` | `401` without a session; otherwise returns the caller's `userId` and `email` |
| POST   | `/me/diary-entries` | Adds a catalog food with grams and an explicit Istanbul calendar date to the caller's diary |
| GET    | `/me/diary-entries?date=yyyy-MM-dd` | Lists only the caller's entries and snapshot-based nutrition summary for the selected day |
| PATCH  | `/me/diary-entries/{id}` | Updates the caller's grams/date/mealSlot while preserving food/nutrition/source snapshots; unknown/other owner returns 404 |
| DELETE | `/me/diary-entries/{id}` | Deletes only the caller's entry; 204 on success, unknown/other owner returns 404 |

See [diary model and HTTP contract](docs/diary-contract.md) for validation, nutrition snapshots and date semantics. Apply the new migration explicitly before using these endpoints; the API never migrates on startup.

The catalog and health endpoints stay public. Cookie-backed mutations and cookie login require an API antiforgery token, including direct calls to `/auth/logout`; bearer-only mobile calls do not. See [identity and session design](docs/auth-session.md) for the web/mobile network and CSRF boundary, built-in auxiliary routes and current email-flow limitation.

> `/meals` now reads PostgreSQL. Until real meals are imported, a new development
> database returns an empty list and `totalCount: 0`. The eight sourced starter
> foods are added only by the explicit seed command. The 25 English demo records
> exist only in the isolated integration test database.

### Example requests

```bash
# Health check
curl -i http://127.0.0.1:5080/health/live

# List first page of meals
curl -i "http://127.0.0.1:5080/meals"

# Search meals by name with custom page size
curl -i "http://127.0.0.1:5080/meals?search=mercimek&pageSize=5"

# Get single meal by ID (404 on an empty database)
curl -i "http://127.0.0.1:5080/meals/1"

# Invalid meal ID (returns 400 Bad Request)
curl -i "http://127.0.0.1:5080/meals/abc"
```

