namespace RestaurantReviews.Api.Data;

public class Restaurant
{
    public Guid Id { get; set; }
    public Guid OwnerId { get; set; }
    public required string Title { get; set; }
    public required string Location { get; set; }
    public required string Description { get; set; }
    public RestaurantImage? Image { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<Cuisine> Cuisines { get; set; } = [];
    public List<Review> Reviews { get; set; } = [];
}

// Kept in its own table so loading a restaurant doesn't also load its image.
public class RestaurantImage
{
    // New for each uploaded image, so the image URL changes whenever the image does.
    public Guid Id { get; set; }
    public Guid RestaurantId { get; set; }
    public required string ContentType { get; set; }
    public required byte[] Data { get; set; }
}

// One row per cuisine a restaurant has, stored in the restaurant_cuisines table.
public class RestaurantCuisine
{
    public Guid RestaurantId { get; set; }
    public Guid CuisineId { get; set; }
}
