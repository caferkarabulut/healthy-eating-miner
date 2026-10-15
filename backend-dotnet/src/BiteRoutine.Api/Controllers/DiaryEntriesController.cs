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
        if (decimal.Round(request.Grams, 2) != request.Grams)
        {
            ModelState.AddModelError(nameof(request.Grams), "Gramaj en fazla iki ondalık basamak içerebilir.");
            return ValidationProblem(ModelState);
        }

        var user = await users.GetUserAsync(User);
        if (user is null) return Unauthorized();
        var meal = await db.Meals.AsNoTracking().SingleOrDefaultAsync(x => x.MealId == request.MealId, cancellationToken);
        if (meal is null) return NotFound();

        var entry = new DiaryEntry
        {
            UserId = user.Id, MealId = meal.MealId, MealSlot = request.MealSlot, Date = request.Date!.Value, Grams = request.Grams,
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
        if (decimal.Round(request.Grams, 2) != request.Grams)
        {
            ModelState.AddModelError(nameof(request.Grams), "Gramaj en fazla iki ondalık basamak içerebilir.");
            return ValidationProblem(ModelState);
        }

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
        entry.Grams = request.Grams;
        entry.Date = request.Date!.Value;
        try { await db.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateConcurrencyException) { return NotFound(); }
        return Ok(DiaryEntryResponse.From(entry));
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
