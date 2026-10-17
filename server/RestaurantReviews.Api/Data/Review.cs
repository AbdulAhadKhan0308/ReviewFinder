namespace RestaurantReviews.Api.Data;

public class Review
{
    public Guid Id { get; set; }
    public Guid RestaurantId { get; set; }
    public Guid ReviewerId { get; set; }
    public AppUser Reviewer { get; set; } = null!;
    public short Rating { get; set; }
    public string? Text { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
