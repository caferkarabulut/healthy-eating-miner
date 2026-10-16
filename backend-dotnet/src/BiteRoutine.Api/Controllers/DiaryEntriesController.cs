using System.Globalization;
using BiteRoutine.Api.Contracts;
using BiteRoutine.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BiteRoutine.Api.Controllers;

[ApiController]
[Authorize]
[Route("me/diary-entries")]
public sealed class DiaryEntriesController(BiteRoutineDbContext db, UserManager<IdentityUser> users) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<DiaryEntryResponse>> Create(CreateDiaryEntryRequest request, CancellationToken cancellationToken)
    {
        var user = await users.GetUserAsync(User);
        if (user is null) return Unauthorized();
        var meal = await db.Meals.AsNoTracking().SingleOrDefaultAsync(x => x.MealId == request.MealId, cancellationToken);
        if (meal is null) return NotFound();

        var amount = await ResolveAmount(request, meal.MealId, cancellationToken);
        if (amount is null) return ValidationProblem(ModelState);
        var entry = new DiaryEntry
        {
            UserId = user.Id, MealId = meal.MealId, MealSlot = request.MealSlot, Date = request.Date!.Value, Grams = amount.Value.Grams, Portion = amount.Value.Portion,
            MealName = meal.MealName, CaloriesKcalPer100G = meal.CaloriesKcalPer100G,
            ProteinGPer100G = meal.ProteinGPer100G, CarbsGPer100G = meal.CarbsGPer100G, FatGPer100G = meal.FatGPer100G,
            Source = meal.NutritionSource, SourceId = meal.NutritionSourceId, SourceUrl = meal.NutritionSourceUrl
        };
        db.DiaryEntries.Add(entry);
        await db.SaveChangesAsync(cancellationToken);
        return Created($"/me/diary-entries?date={entry.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)}", DiaryEntryResponse.From(entry));
    }

    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<DiaryEntryResponse>> Update(Guid id, UpdateDiaryEntryRequest request, CancellationToken cancellationToken)
    {
        if (request.MealSlot is not null && request.MealSlot is not ("breakfast" or "lunch" or "dinner" or "snack" or "other"))
        {
            ModelState.AddModelError(nameof(request.MealSlot), "Geçerli bir öğün seçin.");
            return ValidationProblem(ModelState);
        }

        var user = await users.GetUserAsync(User);
        if (user is null) return Unauthorized();
        var entry = await db.DiaryEntries.SingleOrDefaultAsync(x => x.Id == id && x.UserId == user.Id, cancellationToken);
        if (entry is null) return NotFound();
        if (request.MealSlot is not null) entry.MealSlot = request.MealSlot;
        if (request.Grams is not null || request.PortionId is not null || request.Quantity is not null)
        {
            var amount = await ResolveAmount(request, entry.MealId, cancellationToken);
            if (amount is null) return ValidationProblem(ModelState);
            entry.Grams = amount.Value.Grams;
            entry.Portion = amount.Value.Portion;
        }
        entry.Date = request.Date!.Value;
        try { await db.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateConcurrencyException) { return NotFound(); }
        return Ok(DiaryEntryResponse.From(entry));
    }

    private async Task<(decimal Grams, DiaryPortionSnapshot? Portion)?> ResolveAmount(DiaryAmountRequest request, int mealId, CancellationToken cancellationToken)
    {
        if (request.Grams is { } grams) return (grams, null);
        var portion = await db.FoodPortions.AsNoTracking().SingleOrDefaultAsync(x => x.Id == request.PortionId && x.MealId == mealId, cancellationToken);
        if (portion is null)
        {
            ModelState.AddModelError(nameof(request.PortionId), "Bu gıda için geçerli bir ölçü seçin.");
            return null;
        }
        decimal converted;
        try { converted = decimal.Round(request.Quantity!.Value * portion.GramWeight / portion.Amount, 2, MidpointRounding.AwayFromZero); }
        catch (OverflowException) { converted = -1; }
        if (converted < 0.01m || converted > 10000m)
        {
            ModelState.AddModelError(nameof(request.Quantity), "Miktarın gram karşılığı 0,01–10.000 g olmalıdır.");
            return null;
        }
        return (converted, new DiaryPortionSnapshot {
            PortionId = portion.Id, Quantity = request.Quantity!.Value, MeasureName = portion.MeasureName,
            SourceAmount = portion.Amount, SourceGramWeight = portion.GramWeight, Source = portion.Source,
            SourceFoodId = portion.SourceFoodId, SourceId = portion.SourceId,
            SourceDescription = portion.SourceDescription, SourceUrl = portion.SourceUrl
        });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var user = await users.GetUserAsync(User);
        if (user is null) return Unauthorized();
        var deleted = await db.DiaryEntries.Where(x => x.Id == id && x.UserId == user.Id).ExecuteDeleteAsync(cancellationToken);
        return deleted == 0 ? NotFound() : NoContent();
    }

    [HttpGet]
    public async Task<ActionResult<DiaryDayResponse>> List([FromQuery] string? date, CancellationToken cancellationToken)
    {
        if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var day))
        {
            ModelState.AddModelError(nameof(date), "Tarih yyyy-MM-dd biçiminde zorunludur.");
            return ValidationProblem(ModelState);
        }

        var user = await users.GetUserAsync(User);
        if (user is null) return Unauthorized();
        var entries = await db.DiaryEntries.AsNoTracking()
            .Where(x => x.UserId == user.Id && x.Date == day)
            .OrderBy(x => x.CreatedAtUtc).ThenBy(x => x.Id).ToListAsync(cancellationToken);
        var items = entries.Select(DiaryEntryResponse.From).ToArray();
        return Ok(new DiaryDayResponse(day, "Europe/Istanbul", items, DiaryMealSummaryResponse.From(items), DiarySummaryResponse.From(items)));
    }
}
