using System.ComponentModel.DataAnnotations;
using BiteRoutine.Api.Contracts;
using BiteRoutine.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
namespace BiteRoutine.Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("meals/{mealId}/portions")]
public sealed class FoodPortionsController(BiteRoutineDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<FoodPortionListResponse>> List([FromRoute, Range(1, int.MaxValue)] int mealId, CancellationToken cancellationToken)
    {
        if (!await db.Meals.AnyAsync(x => x.MealId == mealId, cancellationToken)) return NotFound();
        var portions = await db.FoodPortions.AsNoTracking().Where(x => x.MealId == mealId)
            .OrderBy(x => x.Id).ToListAsync(cancellationToken);
        return Ok(new FoodPortionListResponse(mealId, portions.Select(FoodPortionResponse.From).ToArray()));
    }
}
