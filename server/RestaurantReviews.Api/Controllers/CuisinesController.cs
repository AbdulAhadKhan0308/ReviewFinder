using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RestaurantReviews.Api.Data;

namespace RestaurantReviews.Api.Controllers;

public record CuisineDto(Guid Id, string Name);

// TODO: limit to signed-in users once sign-in exists.
[ApiController]
[Route("api/cuisines")]
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
