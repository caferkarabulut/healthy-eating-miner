using BiteRoutine.Api.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace BiteRoutine.Api.Controllers;

[ApiController]
[Route("me")]
[Authorize]
public sealed class MeController(UserManager<IdentityUser> userManager) : ControllerBase
{
    [HttpGet]
    [Produces("application/json")]
    public async Task<ActionResult<MeResponse>> Get()
    {
        var user = await userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized();
        }

        return Ok(new MeResponse(user.Id, user.Email));
    }
}
