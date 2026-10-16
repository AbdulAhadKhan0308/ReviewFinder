namespace RestaurantReviews.Api.Data;

public class Restaurant
{
    public Guid Id { get; set; }
    public Guid OwnerId { get; set; }
    public required string Title { get; set; }
    public required string Location { get; set; }
    public required string Description { get; set; }
    public string? ImageKey { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<Cuisine> Cuisines { get; set; } = [];
}

// One row per cuisine a restaurant has, stored in the restaurant_cuisines table.
public class RestaurantCuisine
{
    public Guid RestaurantId { get; set; }
    public Guid CuisineId { get; set; }
}
