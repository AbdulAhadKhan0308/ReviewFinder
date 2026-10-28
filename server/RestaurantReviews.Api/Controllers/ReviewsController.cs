using System.ComponentModel.DataAnnotations;
using System.Linq.Expressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RestaurantReviews.Api.Auth;
using RestaurantReviews.Api.Data;

namespace RestaurantReviews.Api.Controllers;

public record ReviewInput
{
    // Nullable so a missing rating is reported as missing rather than as 0.
    [Required(ErrorMessage = "Choose a rating.")]
    [Range(1, 5, ErrorMessage = "Rating must be between 1 and 5.")]
    public int? Rating { get; init; }

    // Trimmed as it's read; blank text is stored as no text.
    [MaxLength(2000, ErrorMessage = "Review must be 2,000 characters or fewer.")]
    public string? Text { get; init => field = string.IsNullOrWhiteSpace(value) ? null : value.Trim(); }
}

// Query string for listing a restaurant's reviews. Explicit names key validation errors by the query parameter.
public record ReviewQuery : IValidatableObject
{
    public const string Newest = "newest";
    public const string Oldest = "oldest";
    public const string RatingDesc = "ratingDesc";
    public const string RatingAsc = "ratingAsc";

    [FromQuery(Name = "keyword")]
    [MaxLength(100, ErrorMessage = "Keyword must be 100 characters or fewer.")]
    public string? Keyword { get; init => field = string.IsNullOrWhiteSpace(value) ? null : value.Trim(); }

    [FromQuery(Name = "minRating")]
    [Range(1, 5, ErrorMessage = "Minimum rating must be between 1 and 5.")]
    public int? MinRating { get; init; }

    [FromQuery(Name = "maxRating")]
    [Range(1, 5, ErrorMessage = "Maximum rating must be between 1 and 5.")]
    public int? MaxRating { get; init; }

    // Compared with the date each review was written: from is inclusive, to is exclusive.
    [FromQuery(Name = "writtenFrom")]
    public DateTimeOffset? WrittenFrom { get; init; }

    [FromQuery(Name = "writtenTo")]
    public DateTimeOffset? WrittenTo { get; init; }

    [FromQuery(Name = "sort")]
    [AllowedValues(Newest, Oldest, RatingDesc, RatingAsc, ErrorMessage = "Sort must be newest, oldest, ratingDesc or ratingAsc.")]
    public string Sort { get; init; } = Newest;

    [FromQuery(Name = "mine")]
    public int? Mine { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (MinRating > MaxRating)
        {
            yield return new ValidationResult("Minimum rating can't be greater than maximum rating.", ["minRating"]);
        }

        if (WrittenFrom >= WrittenTo)
        {
            yield return new ValidationResult("The start of the date range must be before its end.", ["writtenFrom"]);
        }
    }
}

public record ReviewDto(
    Guid Id,
    int Rating,
    string? Text,
    string AuthorDisplayName,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    // Only decides whether the app shows edit and delete buttons; the server checks authorship itself.
    bool IsMine);

[ApiController]
[Authorize]
public class ReviewsController(AppDbContext db) : ControllerBase
{
    private const string ReviewerRole = nameof(UserRole.Reviewer);

    [HttpGet("/api/restaurants/{restaurantId:guid}/reviews")]
    public async Task<ActionResult<PagedResult<ReviewDto>>> GetForRestaurant(
        Guid restaurantId,
        [FromQuery] ReviewQuery query,
        [FromQuery] PageRequest paging,
        CancellationToken cancellationToken)
    {
        var visible = await db.Restaurants.AsNoTracking().VisibleTo(User).AnyAsync(r => r.Id == restaurantId, cancellationToken);
        if (!visible)
        {
            return NotFound();
        }

        var reviews = db.Reviews.AsNoTracking().Where(r => r.RestaurantId == restaurantId);
        if (query.Keyword is not null)
        {
            var pattern = RestaurantQueries.ContainsPattern(query.Keyword);
            reviews = reviews.Where(r => EF.Functions.ILike(r.Text!, pattern, @"\"));
        }

        if (query.MinRating is { } minRating)
        {
            reviews = reviews.Where(r => r.Rating >= minRating);
        }

        if (query.MaxRating is { } maxRating)
        {
            reviews = reviews.Where(r => r.Rating <= maxRating);
        }

        if (query.WrittenFrom is { } from)
        {
            var fromUtc = from.UtcDateTime;
            reviews = reviews.Where(r => r.CreatedAt >= fromUtc);
        }

        if (query.WrittenTo is { } to)
        {
            var toUtc = to.UtcDateTime;
            reviews = reviews.Where(r => r.CreatedAt < toUtc);
        }

        if (query.Mine is { } mine && mine == 1)
        {
            reviews = reviews.Where(r => r.ReviewerId == User.GetUserId());
        }

        // Equal ratings show newest first; the ID makes the order stable across pages.
        var ordered = query.Sort switch
        {
            ReviewQuery.Oldest => reviews.OrderBy(r => r.CreatedAt).ThenBy(r => r.Id),
            ReviewQuery.RatingDesc => reviews.OrderByDescending(r => r.Rating).ThenByDescending(r => r.CreatedAt).ThenByDescending(r => r.Id),
            ReviewQuery.RatingAsc => reviews.OrderBy(r => r.Rating).ThenByDescending(r => r.CreatedAt).ThenByDescending(r => r.Id),
            _ => reviews.OrderByDescending(r => r.CreatedAt).ThenByDescending(r => r.Id),
        };

        var totalCount = await reviews.CountAsync(cancellationToken);
        var items = await ordered
            .Skip(paging.Skip)
            .Take(paging.PageSize)
            .Select(ToDto(User.GetUserId()))
            .ToListAsync(cancellationToken);

        return new PagedResult<ReviewDto>(items, paging.Page, paging.PageSize, totalCount);
    }

    [HttpPost("/api/restaurants/{restaurantId:guid}/reviews")]
    [Authorize(Roles = ReviewerRole)]
    public async Task<ActionResult<ReviewDto>> Create(Guid restaurantId, ReviewInput input, CancellationToken cancellationToken)
    {
        if (!await db.Restaurants.AnyAsync(r => r.Id == restaurantId, cancellationToken))
        {
            return NotFound();
        }

        var now = DateTime.UtcNow;
        var review = new Review
        {
            Id = Guid.CreateVersion7(),
            RestaurantId = restaurantId,
            ReviewerId = User.GetUserId(),
            Rating = (short)input.Rating!.Value,
            Text = input.Text,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Reviews.Add(review);
        // Not cancellable: once saving starts, finish it rather than leave the outcome unknown.
        await db.SaveChangesAsync(CancellationToken.None);

        return StatusCode(StatusCodes.Status201Created, await LoadDto(review.Id));
    }

    [HttpPut("/api/reviews/{id:guid}")]
    [Authorize(Roles = ReviewerRole)]
    public async Task<ActionResult<ReviewDto>> Update(Guid id, ReviewInput input, CancellationToken cancellationToken)
    {
        var review = await db.Reviews.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (review is null)
        {
            return NotFound();
        }

        // Reviewers can see every review, so someone else's is forbidden rather than not found.
        if (review.ReviewerId != User.GetUserId())
        {
            return Forbid();
        }

        review.Rating = (short)input.Rating!.Value;
        review.Text = input.Text;
        review.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(CancellationToken.None);

        return await LoadDto(review.Id);
    }

    [HttpDelete("/api/reviews/{id:guid}")]
    [Authorize(Roles = ReviewerRole)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var reviewerId = await db.Reviews.Where(r => r.Id == id).Select(r => (Guid?)r.ReviewerId).FirstOrDefaultAsync(cancellationToken);
        if (reviewerId is null)
        {
            return NotFound();
        }

        if (reviewerId != User.GetUserId())
        {
            return Forbid();
        }

        await db.Reviews.Where(r => r.Id == id).ExecuteDeleteAsync(CancellationToken.None);
        return NoContent();
    }

    private static Expression<Func<Review, ReviewDto>> ToDto(Guid userId) => r => new ReviewDto(
        r.Id,
        r.Rating,
        r.Text,
        r.Reviewer.DisplayName,
        r.CreatedAt,
        r.UpdatedAt,
        r.ReviewerId == userId);

    private Task<ReviewDto> LoadDto(Guid id) =>
        db.Reviews.AsNoTracking().Where(r => r.Id == id).Select(ToDto(User.GetUserId())).FirstAsync(CancellationToken.None);
}
