using BiteRoutine.Api.Contracts;
using Microsoft.AspNetCore.Mvc;

namespace BiteRoutine.Api.Controllers;

[ApiController]
[Route("health")]
public sealed class HealthController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<HealthController> _logger;

    public HealthController(IConfiguration configuration, ILogger<HealthController> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    [HttpGet("live")]
    [Produces("application/json")]
    public ActionResult<HealthResponse> Live()
    {
        var serviceName = _configuration["Application:Name"] ?? "Bite Routine";

        _logger.LogDebug("Liveness check requested for {ServiceName}", serviceName);

        return Ok(new HealthResponse("ok", serviceName));
    }
}
