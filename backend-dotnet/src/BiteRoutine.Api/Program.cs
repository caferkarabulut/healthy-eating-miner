using BiteRoutine.Api.Data;
using BiteRoutine.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Register MVC controller services and application services in the DI container.
builder.Services.AddControllers();
builder.Services.AddDbContext<BiteRoutineDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("BiteRoutine")
        ?? throw new InvalidOperationException("ConnectionStrings:BiteRoutine must be configured.")));
builder.Services.AddScoped<MealCatalogService>();
builder.Services.AddAuthorization();
builder.Services.AddIdentityApiEndpoints<IdentityUser>(options =>
    {
        options.User.RequireUniqueEmail = true;
        options.Password.RequiredLength = 8;
    })
    .AddEntityFrameworkStores<BiteRoutineDbContext>();

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

app.MapGroup("/auth").MapIdentityApi<IdentityUser>();
app.MapPost("/auth/logout", async (HttpContext context, SignInManager<IdentityUser> signInManager) =>
    {
        var session = await context.AuthenticateAsync(IdentityConstants.ApplicationScheme);
        if (!session.Succeeded) return Results.Unauthorized();
        await signInManager.SignOutAsync();
        return Results.NoContent();
    });

// Map attribute-routed public catalog and protected profile controllers.
app.MapControllers();

app.Run();

// Exposes the implicit Program class to WebApplicationFactory<Program> in integration tests.
public partial class Program;

