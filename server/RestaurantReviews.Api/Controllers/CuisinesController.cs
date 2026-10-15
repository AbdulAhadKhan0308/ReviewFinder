using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RestaurantReviews.Api.Data;

namespace RestaurantReviews.Api.Controllers;

public record CuisineDto(Guid Id, string Name);

[ApiController]
[Route("api/cuisines")]
[Authorize]
public class CuisinesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<CuisineDto>> GetAll(CancellationToken cancellationToken) =>
        await db.Cuisines
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new CuisineDto(c.Id, c.Name))
            .ToListAsync(cancellationToken);
}
