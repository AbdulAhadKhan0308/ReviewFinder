using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;

namespace RestaurantReviews.Api.Controllers;

// Query string for paginated lists: ?page=1&pageSize=12.
// The explicit names also key validation errors by the query parameter ("pageSize"), not the C# name.
public record PageRequest
{
    // The upper limit keeps the row offset, (page - 1) * pageSize, well within int range.
    [FromQuery(Name = "page")]
    [Range(1, 100_000, ErrorMessage = "Page must be between 1 and 100,000.")]
    public int Page { get; init; } = 1;

    [FromQuery(Name = "pageSize")]
    [Range(1, 50, ErrorMessage = "Page size must be between 1 and 50.")]
    public int PageSize { get; init; } = 12;

    public int Skip => (Page - 1) * PageSize;
}

public record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount);
