using BiteRoutine.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Register MVC controller services and application services in the DI container.
builder.Services.AddControllers();
builder.Services.AddScoped<MealCatalogService>();

var app = builder.Build();

// Map attribute-routed controllers (e.g. HealthController, MealsController) to endpoints.
app.MapControllers();

app.Run();

// Exposes the implicit Program class to WebApplicationFactory<Program> in integration tests.
public partial class Program;
