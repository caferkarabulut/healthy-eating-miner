namespace BiteRoutine.Api.Contracts;

/// <summary>Response body returned by the liveness endpoint.</summary>
public sealed record HealthResponse(string Status, string Service);
