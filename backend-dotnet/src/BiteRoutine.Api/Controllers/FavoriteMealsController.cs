using System.ComponentModel.DataAnnotations;
using BiteRoutine.Api.Contracts;
using BiteRoutine.Api.Data;
using BiteRoutine.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BiteRoutine.Api.Controllers;

[ApiController]
[Authorize]
[ResponseCache(Location = ResponseCacheLocation.None, NoStore = true)]
[Route("me/favorite-meals")]
public sealed class FavoriteMealsController(BiteRoutineDbContext db, UserManager<IdentityUser> users, MealCatalogService catalog) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<MealListResponse>> List([FromQuery] MealCatalogQuery query, CancellationToken cancellationToken)
    {
        var user = await users.GetUserAsync(User);
        if (user is null) return Unauthorized();
        return Ok(await catalog.GetFavoriteMealsAsync(user.Id, query, cancellationToken));
    }

    [HttpPut("{mealId}")]
    public async Task<IActionResult> Add([FromRoute, Range(1, int.MaxValue)] int mealId, CancellationToken cancellationToken)
    {
        var user = await users.GetUserAsync(User);
        if (user is null) return Unauthorized();
        // Atomic upsert also makes concurrent repeat requests safe under the composite key.
        var inserted = await db.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO favorite_meals (user_id, meal_id)
            SELECT {user.Id}, meal_id FROM meals WHERE meal_id = {mealId}
            ON CONFLICT (user_id, meal_id) DO NOTHING
            """, cancellationToken);
        if (inserted == 0 && !await db.Meals.AnyAsync(x => x.MealId == mealId, cancellationToken)) return NotFound();
        return NoContent();
    }

    [HttpDelete("{mealId}")]
    public async Task<IActionResult> Remove([FromRoute, Range(1, int.MaxValue)] int mealId, CancellationToken cancellationToken)
    {
        var user = await users.GetUserAsync(User);
        if (user is null) return Unauthorized();
        await db.FavoriteMeals.Where(x => x.UserId == user.Id && x.MealId == mealId).ExecuteDeleteAsync(cancellationToken);
        return NoContent();
    }
}
