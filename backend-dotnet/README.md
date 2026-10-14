# Bite Routine — .NET Backend

> Track Your Food, Build Your Routine.

ASP.NET Core Web API (controllers) for Bite Routine, targeting **.NET 10** (`net10.0`).

## Requirements

- .NET SDK 10.0.402 or a later installed SDK in the same 10.0.4xx feature band.
  `global.json` sets `version: 10.0.402` with `rollForward: latestPatch`, so the CLI
  picks the highest installed 10.0.4xx SDK that is >= 10.0.402. It never rolls
  forward to 10.0.5xx (or later) and never downloads an SDK. Prerelease SDKs are
  not allowed (`allowPrerelease: false`).

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
dotnet restore BiteRoutine.slnx
dotnet build BiteRoutine.slnx --no-restore
dotnet test BiteRoutine.slnx --no-build
```

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

> **Demo Data Note:** The `/meals` endpoints currently serve 25 immutable in-memory demo records. No database, SQL, or external data source is connected in this initial slice; operations validate the HTTP contract, pagination, search, and error handling.

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
