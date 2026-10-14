# Bite Routine — .NET Backend

> Track Your Food, Build Your Routine.

ASP.NET Core Web API (controllers) for Bite Routine, targeting **.NET 10** (`net10.0`).

## Requirements

- .NET SDK 10.0.402 or a later installed SDK in the same 10.0.4xx feature band.
  `global.json` sets `version: 10.0.402` with `rollForward: latestPatch`, so the CLI
  picks the highest installed 10.0.4xx SDK that is >= 10.0.402. It never rolls
  forward to 10.0.5xx (or later) and never downloads an SDK. Prerelease SDKs are
  not allowed (`allowPrerelease: false`).
- Docker Desktop or another PostgreSQL 17 server for the database tests and local API.

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
dotnet build BiteRoutine.slnx --no-restore
BITE_ROUTINE_TEST_CONNECTION='Host=127.0.0.1;Port=5433;Database=bite_routine_test;Username=bite_routine;Password=local_dev_only' dotnet test BiteRoutine.slnx --no-build
```

`compose.yaml` exposes PostgreSQL only on localhost port 5433. The `bite_routine`
database is for local development; `bite_routine_test` is only for integration
tests. These are local example credentials, not production secrets. The test
database is created by the init script when the Docker volume is first created.
The integration fixture applies migrations and seeds 25 demo meals **only in the
test database**. Run the test command against an empty, dedicated test database.

## Database setup

Apply the checked-in EF Core migration to the development database:

```bash
ASPNETCORE_ENVIRONMENT=Development dotnet ef database update --project src/BiteRoutine.Api
```

The development connection string is in `appsettings.Development.json`. When
deploying, set `ConnectionStrings__BiteRoutine` to the managed PostgreSQL
connection string and apply the reviewed migrations as a separate deployment
step. Do not rely on the API to create or migrate a production database.

Only the catalog fields (`mealId`, `mealName`, `cuisine`, `mealType`) are modeled
so far. The database starts **empty** outside the test fixture. Importing real
Turkish meal data and confirming the source nutrition units are separate work;
no English demo meals are added to a user-facing database.

## Continuous integration

GitHub Actions workflow `.github/workflows/dotnet-ci.yml` runs on pull requests
targeting `main` and on pushes to `main`, only when files under `backend-dotnet/`
or the workflow itself change. On `ubuntu-latest` it installs the SDK from
`global.json`, then runs `dotnet restore`, `dotnet build` (Release) and
`dotnet test` (Release) for `BiteRoutine.slnx`. It uses read-only permissions and
an ephemeral PostgreSQL service, but no secrets, caching, publishing or deployment.

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
| GET    | `/meals`       | `200` `{"items":[...],"page":1,"pageSize":20,"totalCount":25}` |
| GET    | `/meals/{mealId}` | `200` `{"mealId":1,"mealName":"Demo Pasta",...}` |

> `/meals` now reads PostgreSQL. Until real meals are imported, a new development
> database returns an empty list and `totalCount: 0`. The 25 demo records exist
> only in the isolated integration test database.

### Example requests

```bash
# Health check
curl -i http://127.0.0.1:5080/health/live

# List first page of meals
curl -i "http://127.0.0.1:5080/meals"

# Search meals by name with custom page size
curl -i "http://127.0.0.1:5080/meals?search=pasta&pageSize=5"

# Get single meal by ID
curl -i "http://127.0.0.1:5080/meals/1"

# Invalid meal ID (returns 400 Bad Request)
curl -i "http://127.0.0.1:5080/meals/abc"
```

