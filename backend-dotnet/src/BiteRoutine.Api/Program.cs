using BiteRoutine.Api.Data;
using BiteRoutine.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Antiforgery;
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
builder.Services.AddAntiforgery(options =>
{
    options.Cookie.Name = "bite_routine_api_csrf";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.HeaderName = "X-Bite-Routine-Api-Csrf";
});
builder.Services.AddIdentityApiEndpoints<IdentityUser>(options =>
    {
        options.User.RequireUniqueEmail = true;
        options.Password.RequiredLength = 8;
    })
    .AddEntityFrameworkStores<BiteRoutineDbContext>();

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();
app.Use(async (context, next) =>
{
    var isMutation = HttpMethods.IsPost(context.Request.Method)
        || HttpMethods.IsPut(context.Request.Method)
        || HttpMethods.IsPatch(context.Request.Method)
        || HttpMethods.IsDelete(context.Request.Method);
    var usesIdentityCookie = context.Request.Cookies.ContainsKey(".AspNetCore.Identity.Application");
    var issuesIdentityCookie = context.Request.Path.Equals("/auth/login", StringComparison.OrdinalIgnoreCase)
        && string.Equals(context.Request.Query["useCookies"], "true", StringComparison.OrdinalIgnoreCase);

    if (isMutation && (usesIdentityCookie || issuesIdentityCookie))
    {
        var antiforgery = context.RequestServices.GetRequiredService<IAntiforgery>();
        if (!await antiforgery.IsRequestValidAsync(context))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return;
        }
    }

    await next(context);
});

app.MapGroup("/auth").MapIdentityApi<IdentityUser>();
app.MapGet("/auth/antiforgery", (HttpContext context, IAntiforgery antiforgery) =>
{
    var tokens = antiforgery.GetAndStoreTokens(context);
    context.Response.Headers.CacheControl = "no-store";
    return Results.Ok(new { requestToken = tokens.RequestToken });
});
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

