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
[ResponseCache(Location = ResponseCacheLocation.None, NoStore = true)]
[Route("me/diary-summary")]
public sealed class DiarySummaryController(BiteRoutineDbContext db, UserManager<IdentityUser> users) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<DiaryHistoryResponse>> List([FromQuery] string? endDate, CancellationToken cancellationToken)
    {
        if (!DateOnly.TryParseExact(endDate, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var end)
            || end.DayNumber < 6)
        {
            ModelState.AddModelError(nameof(endDate), "Use yyyy-MM-dd, from 0001-01-07 onwards.");
            return ValidationProblem(ModelState);
        }
        var user = await users.GetUserAsync(User);
        if (user is null) return Unauthorized();
        var start = end.AddDays(-6);
        // One range query; summaries use the same snapshot calculation as the daily list.
        var entries = await db.DiaryEntries.AsNoTracking()
            .Where(x => x.UserId == user.Id && x.Date >= start && x.Date <= end)
            .ToListAsync(cancellationToken);
        var byDay = entries.Select(DiaryEntryResponse.From).ToLookup(x => x.Date);
        var days = Enumerable.Range(0, 7).Select(offset =>
        {
            var date = start.AddDays(offset);
            return new DiarySummaryDayResponse(date, DiarySummaryResponse.From(byDay[date].ToArray()));
        }).ToArray();
        return Ok(new DiaryHistoryResponse(start, end, "Europe/Istanbul", days));
    }
}
