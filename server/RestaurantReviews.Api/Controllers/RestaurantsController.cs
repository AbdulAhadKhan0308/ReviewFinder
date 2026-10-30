using System.ComponentModel.DataAnnotations;
using System.Linq.Expressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RestaurantReviews.Api.Auth;
using RestaurantReviews.Api.Data;
using RestaurantReviews.Api.Images;

namespace RestaurantReviews.Api.Controllers;

// Text fields are trimmed as they are read, so validation and storage both use the trimmed value.
public record RestaurantInput
{
    [Required(ErrorMessage = "Enter a title.")]
    [MaxLength(100, ErrorMessage = "Title must be 100 characters or fewer.")]
    public string Title { get; init => field = value?.Trim() ?? ""; } = "";

    [Required(ErrorMessage = "Enter a location.")]
    [MaxLength(200, ErrorMessage = "Location must be 200 characters or fewer.")]
    public string Location { get; init => field = value?.Trim() ?? ""; } = "";

    [Required(ErrorMessage = "Enter a description.")]
    [MaxLength(2000, ErrorMessage = "Description must be 2,000 characters or fewer.")]
    public string Description { get; init => field = value?.Trim() ?? ""; } = "";

    // Duplicates are dropped, so the 1 to 3 limit counts distinct cuisines.
    [Length(1, 3, ErrorMessage = "Choose 1 to 3 cuisines.")]
    public IReadOnlyList<Guid> CuisineIds { get; init => field = value?.Distinct().ToList() ?? []; } = [];

    // Base64 of a JPG, PNG or WebP file. Left out to keep the current image, if any.
    public string? Image { get; init; }
    public string? Website { get; init; }

    // Removes the current image when no new one is sent.
    public bool RemoveImage { get; init; }
}

public record RestaurantSummary(
    Guid Id,
    string Title,
    string? ImageUrl,
    string Location,
    IReadOnlyList<CuisineDto> Cuisines,
    decimal? AverageRating,
    int ReviewCount);

public record RestaurantDetail(
    Guid Id,
    string Title,
    string? ImageUrl,
    string Location,
    IReadOnlyList<CuisineDto> Cuisines,
    decimal? AverageRating,
    int ReviewCount,
    string Description,
    string? Website,
    DateTime CreatedAt,
    DateTime UpdatedAt);

[ApiController]
[Route("api/restaurants")]
[Authorize]
public class RestaurantsController(AppDbContext db) : ControllerBase
{
    private const string OwnerRole = nameof(UserRole.Owner);
    private const string ReviewerRole = nameof(UserRole.Reviewer);

    // A 5 MB image is about 7 MB as base64, plus the other fields.
    private const long MaxSaveRequestBytes = 8 * 1024 * 1024;

    // The average is rounded in the database (ROUND(AVG(rating), 2)), so display, filtering and sorting all use one value.
    private static readonly Expression<Func<Restaurant, RestaurantSummary>> ToSummary = r => new RestaurantSummary(
        r.Id,
        r.Title,
        ImageUrl(r.Id, r.Image == null ? (Guid?)null : r.Image.Id),
        r.Location,
        r.Cuisines.OrderBy(c => c.Name).Select(c => new CuisineDto(c.Id, c.Name)).ToList(),
        r.Reviews.Any() ? Math.Round(r.Reviews.Average(v => (decimal)v.Rating), 2) : null,
        r.Reviews.Count);

    private static readonly Expression<Func<Restaurant, RestaurantDetail>> ToDetail = r => new RestaurantDetail(
        r.Id,
        r.Title,
        ImageUrl(r.Id, r.Image == null ? (Guid?)null : r.Image.Id),
        r.Location,
        r.Cuisines.OrderBy(c => c.Name).Select(c => new CuisineDto(c.Id, c.Name)).ToList(),
        r.Reviews.Any() ? Math.Round(r.Reviews.Average(v => (decimal)v.Rating), 2) : null,
        r.Reviews.Count,
        r.Description,
        r.Website,
        r.CreatedAt,
        r.UpdatedAt);

    [HttpGet]
    [Authorize(Roles = ReviewerRole)]
    public async Task<PagedResult<RestaurantSummary>> GetAll(
        [FromQuery] RestaurantListQuery query,
        [FromQuery] PageRequest paging,
        CancellationToken cancellationToken)
    {
        var restaurants = db.Restaurants.AsNoTracking();
        if (query.Keyword is not null)
        {
            var pattern = RestaurantQueries.ContainsPattern(query.Keyword);
            restaurants = restaurants.Where(r =>
                EF.Functions.ILike(r.Title, pattern, @"\")
                || EF.Functions.ILike(r.Location, pattern, @"\")
                || EF.Functions.ILike(r.Description, pattern, @"\"));
        }

        foreach (var cuisineId in query.CuisineIds.Distinct())
        {
            restaurants = restaurants.Where(r => r.Cuisines.Any(c => c.Id == cuisineId));
        }

        // The same rounded average as in the response, so filtering and sorting match what's displayed.
        var rated = restaurants.Select(r => new
        {
            Restaurant = r,
            Rating = r.Reviews.Any() ? Math.Round(r.Reviews.Average(v => (decimal)v.Rating), 2) : (decimal?)null,
        });

        // A rating filter hides unrated restaurants, since their rating is null.
        if (query.MinRating is { } minRating)
        {
            rated = rated.Where(x => x.Rating >= minRating);
        }

        if (query.MaxRating is { } maxRating)
        {
            rated = rated.Where(x => x.Rating <= maxRating);
        }

        // Unrated restaurants come last in both directions; equal ratings are ordered by title, then ID.
        var ordered = query.Sort == RestaurantListQuery.RatingAsc
            ? rated.OrderBy(x => x.Rating == null).ThenBy(x => x.Rating)
            : rated.OrderBy(x => x.Rating == null).ThenByDescending(x => x.Rating);

        var totalCount = await rated.CountAsync(cancellationToken);
        var items = await ordered
            .ThenBy(x => x.Restaurant.Title)
            .ThenBy(x => x.Restaurant.Id)
            .Skip(paging.Skip)
            .Take(paging.PageSize)
            .Select(x => x.Restaurant)
            .Select(ToSummary)
            .ToListAsync(cancellationToken);

        return new PagedResult<RestaurantSummary>(items, paging.Page, paging.PageSize, totalCount);
    }

    [HttpGet("/api/me/restaurants")]
    [Authorize(Roles = OwnerRole)]
    public async Task<PagedResult<RestaurantSummary>> GetMine([FromQuery] PageRequest paging, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var mine = db.Restaurants.AsNoTracking().Where(r => r.OwnerId == userId);

        var totalCount = await mine.CountAsync(cancellationToken);
        var items = await mine
            .OrderByDescending(r => r.CreatedAt)
            .ThenByDescending(r => r.Id)
            .Skip(paging.Skip)
            .Take(paging.PageSize)
            .Select(ToSummary)
            .ToListAsync(cancellationToken);

        return new PagedResult<RestaurantSummary>(items, paging.Page, paging.PageSize, totalCount);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<RestaurantDetail>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var detail = await VisibleRestaurants()
            .Where(r => r.Id == id)
            .Select(ToDetail)
            .FirstOrDefaultAsync(cancellationToken);
        Console.WriteLine("resutaruant detail: {0}", detail);

        return detail is null ? NotFound() : detail;
    }

    // The URL's v parameter is ignored; it changes whenever the image does, so browsers fetch the new one.
    [HttpGet("{id:guid}/image")]
    public async Task<IActionResult> GetImage(Guid id, CancellationToken cancellationToken)
    {
        var image = await VisibleRestaurants()
            .Where(r => r.Id == id)
            .Select(r => r.Image)
            .FirstOrDefaultAsync(cancellationToken);
        if (image is null)
        {
            return NotFound();
        }

        Response.Headers.CacheControl = "private, max-age=31536000, immutable";
        Response.Headers.XContentTypeOptions = "nosniff";
        return File(image.Data, image.ContentType);
    }

    [HttpPost]
    [Authorize(Roles = OwnerRole)]
    [RequestSizeLimit(MaxSaveRequestBytes)]
    public async Task<ActionResult<RestaurantDetail>> Create(RestaurantInput input, CancellationToken cancellationToken)
    {
        var cuisines = await FindCuisines(input.CuisineIds, cancellationToken);
        if (cuisines is null)
        {
            return UnknownCuisines();
        }

        if (!TryReadImage(input.Image, out var image))
        {
            return ValidationProblem(ModelState);
        }

        var now = DateTime.UtcNow;
        var restaurant = new Restaurant
        {
            Id = Guid.CreateVersion7(),
            OwnerId = User.GetUserId(),
            Title = input.Title,
            Location = input.Location,
            Description = input.Description,
            Image = image,
            Cuisines = cuisines,
            CreatedAt = now,
            UpdatedAt = now,
            Website = input.Website
        };
        db.Restaurants.Add(restaurant);
        // Not cancellable: once saving starts, finish it rather than leave the outcome unknown.
        await db.SaveChangesAsync(CancellationToken.None);

        var detail = await db.Restaurants.AsNoTracking()
            .Where(r => r.Id == restaurant.Id)
            .Select(ToDetail)
            .FirstAsync(CancellationToken.None);
        return CreatedAtAction(nameof(GetById), new { id = restaurant.Id }, detail);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = OwnerRole)]
    [RequestSizeLimit(MaxSaveRequestBytes)]
    public async Task<ActionResult<RestaurantDetail>> Update(Guid id, RestaurantInput input, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var restaurant = await db.Restaurants
            .Include(r => r.Cuisines)
            .FirstOrDefaultAsync(r => r.Id == id && r.OwnerId == userId, cancellationToken);
        if (restaurant is null)
        {
            return NotFound();
        }

        var cuisines = await FindCuisines(input.CuisineIds, cancellationToken);
        if (cuisines is null)
        {
            return UnknownCuisines();
        }

        if (!TryReadImage(input.Image, out var image))
        {
            return ValidationProblem(ModelState);
        }

        // One transaction, so the old image is only deleted if the whole update is saved.
        await using var transaction = await db.Database.BeginTransactionAsync(CancellationToken.None);
        if (image is not null || input.RemoveImage)
        {
            await db.RestaurantImages.Where(i => i.RestaurantId == id).ExecuteDeleteAsync(CancellationToken.None);
        }

        if (image is not null)
        {
            image.RestaurantId = id;
            db.RestaurantImages.Add(image);
        }

        restaurant.Title = input.Title;
        restaurant.Location = input.Location;
        restaurant.Description = input.Description;
        if (input.Website is not null)
            restaurant.Website = input.Website;
        restaurant.Cuisines.Clear();
        restaurant.Cuisines.AddRange(cuisines);
        restaurant.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(CancellationToken.None);
        await transaction.CommitAsync(CancellationToken.None);

        return await db.Restaurants.AsNoTracking()
            .Where(r => r.Id == id)
            .Select(ToDetail)
            .FirstAsync(CancellationToken.None);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = OwnerRole)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = User.GetUserId();
        // The database removes the restaurant's cuisine links, image and reviews along with it (ON DELETE CASCADE).
        var deleted = await db.Restaurants
            .Where(r => r.Id == id && r.OwnerId == userId)
            .ExecuteDeleteAsync();

        return deleted == 0 ? NotFound() : NoContent();
    }

    private IQueryable<Restaurant> VisibleRestaurants() => db.Restaurants.AsNoTracking().VisibleTo(User);

    // Returns null if any of the IDs isn't a known cuisine.
    private async Task<List<Cuisine>?> FindCuisines(IReadOnlyList<Guid> ids, CancellationToken cancellationToken)
    {
        var cuisines = await db.Cuisines.Where(c => ids.Contains(c.Id)).ToListAsync(cancellationToken);
        return cuisines.Count == ids.Count ? cuisines : null;
    }

    private ActionResult UnknownCuisines()
    {
        ModelState.AddModelError("cuisineIds", "One or more of the selected cuisines no longer exist. Refresh the page and try again.");
        return ValidationProblem(ModelState);
    }

    // Decodes the uploaded image, if one was sent. Adds a validation error if it isn't a usable image.
    private bool TryReadImage(string? base64, out RestaurantImage? image)
    {
        image = null;
        if (base64 is null)
        {
            return true;
        }

        if (!ImageFile.TryDecode(base64, out var file, out var error))
        {
            ModelState.AddModelError("image", error);
            return false;
        }

        image = new RestaurantImage { Id = Guid.CreateVersion7(), ContentType = file.ContentType, Data = file.Bytes };
        return true;
    }

    private static string? ImageUrl(Guid restaurantId, Guid? imageId) =>
        imageId is null ? null : $"/api/restaurants/{restaurantId}/image?v={imageId}";
}
