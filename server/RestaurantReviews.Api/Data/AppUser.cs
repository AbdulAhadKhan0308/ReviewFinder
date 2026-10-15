using Microsoft.AspNetCore.Identity;

namespace RestaurantReviews.Api.Data;

public enum UserRole
{
    Reviewer,
    Owner,
}

public class AppUser : IdentityUser<Guid>
{
    public required string DisplayName { get; set; }
    public UserRole Role { get; set; }
    public DateTime CreatedAt { get; set; }
}
