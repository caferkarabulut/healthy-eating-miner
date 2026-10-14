# Bite Routine

Bite Routine is a nutrition tracking project being rebuilt for Turkey. The current, working slice is a Turkish-searchable food catalog: an ASP.NET Core API backed by PostgreSQL 17 and a Next.js page that displays source-linked approximate nutrition and a gram-based portion preview.

## Current stack and scope

- `backend-dotnet/`: .NET 10, EF Core, Npgsql and PostgreSQL 17. `GET /health/live`, `GET /meals` and `GET /meals/{mealId}` are implemented and covered by real-database integration tests.
- `web/`: Next.js 16 public catalog at `/`. Search and source-linked nutrition use the .NET API; portion previews scale the 100 g values in the browser without saving data.
- `backend/`: earlier Python/Azure SQL prototype. It remains in the repository as prior work; its auth, logging and coaching features have **not** been ported to .NET. The corresponding older web pages still call that prototype API.
- No mobile client or deployment is included yet.

The development database is empty after migrations. An explicit, repeatable seed adds eight basic foods from [USDA FoodData Central](https://fdc.nal.usda.gov/api-guide/). Their numbers describe approximately **100 g of edible food**, not a serving. The older CSV is not imported because its nutrition units and usage rights have not been verified.

## Run the catalog locally

Install .NET SDK 10 and PostgreSQL 17. Start the database at `127.0.0.1:5433` and create the `bite_routine` and `bite_routine_test` databases with the local example role described in [backend setup](backend-dotnet/README.md). Then:

```bash
cd backend-dotnet
dotnet tool restore
dotnet restore BiteRoutine.slnx
dotnet build BiteRoutine.slnx --no-restore --configuration Release
ASPNETCORE_ENVIRONMENT=Development dotnet ef database update --project src/BiteRoutine.Api --no-build --configuration Release
psql -h 127.0.0.1 -p 5433 -U bite_routine -d bite_routine -v ON_ERROR_STOP=1 -f db/seed-usda-starter.sql
ASPNETCORE_ENVIRONMENT=Development dotnet run --project src/BiteRoutine.Api --configuration Release --no-build --no-launch-profile --urls http://127.0.0.1:5080
```

In a second terminal:

```bash
cd web
npm ci
npm run dev -- --hostname 127.0.0.1
```

Open [the local catalog](http://127.0.0.1:3000). The API is at `http://127.0.0.1:5080`. Set `BITE_ROUTINE_API_URL` for the Next.js server if the API uses a different address. See [web setup](web/README.md) and [project status](docs/PROJECT_STATUS.md) for limitations and next work.

## Validation

From `backend-dotnet/`, run `dotnet test BiteRoutine.slnx --no-build --configuration Release` with `BITE_ROUTINE_TEST_CONNECTION` pointing **only** to `bite_routine_test`. See [backend setup](backend-dotnet/README.md) for the example connection string. From `web/`, run `npm run build`.

License: MIT.
