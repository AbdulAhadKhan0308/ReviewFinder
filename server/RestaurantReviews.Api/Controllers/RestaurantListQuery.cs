using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;

namespace RestaurantReviews.Api.Controllers;

// Query string for the reviewers' restaurant list. Explicit names key validation errors by the query parameter.
public record RestaurantListQuery : IValidatableObject
{
    public const string RatingDesc = "ratingDesc";
    public const string RatingAsc = "ratingAsc";

    [FromQuery(Name = "keyword")]
    [MaxLength(100, ErrorMessage = "Keyword must be 100 characters or fewer.")]
    public string? Keyword { get; init => field = string.IsNullOrWhiteSpace(value) ? null : value.Trim(); }

    // Repeatable; only restaurants that have all of them match.
    [FromQuery(Name = "cuisineIds")]
    [MaxLength(20, ErrorMessage = "Choose 20 cuisines or fewer.")]
    public List<Guid> CuisineIds { get; init; } = [];

    [FromQuery(Name = "minRating")]
    public decimal? MinRating { get; init; }

    [FromQuery(Name = "maxRating")]
    public decimal? MaxRating { get; init; }

    [FromQuery(Name = "sort")]
    [AllowedValues(RatingDesc, RatingAsc, ErrorMessage = "Sort must be ratingDesc or ratingAsc.")]
    public string Sort { get; init; } = RatingDesc;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        var minError = RatingError(MinRating, "Minimum");
        if (minError is not null)
        {
            yield return new ValidationResult(minError, ["minRating"]);
        }

        var maxError = RatingError(MaxRating, "Maximum");
        if (maxError is not null)
        {
            yield return new ValidationResult(maxError, ["maxRating"]);
        }

        if (minError is null && maxError is null && MinRating > MaxRating)
        {
            yield return new ValidationResult("Minimum rating can't be greater than maximum rating.", ["minRating"]);
        }
    }

    private static string? RatingError(decimal? rating, string label) => rating switch
    {
        null => null,
        < 1 or > 5 => $"{label} rating must be between 1 and 5.",
        _ when decimal.Round(rating.Value, 2) != rating.Value => $"{label} rating can have at most 2 decimal places.",
        _ => null,
    };
}
