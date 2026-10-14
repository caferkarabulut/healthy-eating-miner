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
    public ActionResult<MealListResponse> List([FromQuery] MealCatalogQuery query)
    {
        var response = _mealCatalogService.GetMeals(query);
        return Ok(response);
    }

    [HttpGet("{mealId}")]
    [Produces("application/json")]
    public ActionResult<MealResponse> GetById([FromRoute] [Range(1, int.MaxValue)] int mealId)
    {
        var meal = _mealCatalogService.GetMealById(mealId);
        if (meal is null)
        {
            return NotFound();
        }

        return Ok(meal);
    }
}
