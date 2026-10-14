using System.ComponentModel.DataAnnotations;
using BiteRoutine.Api.Contracts;
using BiteRoutine.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BiteRoutine.Api.Controllers;

[ApiController]
[Route("meals")]
[AllowAnonymous]
public sealed class MealsController : ControllerBase
{
    private readonly MealCatalogService _mealCatalogService;

    public MealsController(MealCatalogService mealCatalogService)
    {
        _mealCatalogService = mealCatalogService;
    }

    [HttpGet]
    [Produces("application/json")]
    public async Task<ActionResult<MealListResponse>> List([FromQuery] MealCatalogQuery query, CancellationToken cancellationToken)
    {
        var response = await _mealCatalogService.GetMealsAsync(query, cancellationToken);
        return Ok(response);
    }

    [HttpGet("{mealId}")]
    [Produces("application/json")]
    public async Task<ActionResult<MealResponse>> GetById([FromRoute] [Range(1, int.MaxValue)] int mealId, CancellationToken cancellationToken)
    {
        var meal = await _mealCatalogService.GetMealByIdAsync(mealId, cancellationToken);
        if (meal is null)
        {
            return NotFound();
        }

        return Ok(meal);
    }
}

