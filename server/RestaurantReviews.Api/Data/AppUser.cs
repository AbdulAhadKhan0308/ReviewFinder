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

    public static AppUser Create(string email, string displayName, UserRole role)
    {
        var id = Guid.CreateVersion7();
        return new AppUser
        {
            Id = id,
            // Identity requires unique usernames. Using the ID keeps email out of that rule,
            // so allowing one account per email and role later needs no username changes.
            UserName = id.ToString(),
            Email = email,
            DisplayName = displayName,
            Role = role,
            CreatedAt = DateTime.UtcNow,
        };
    }
}
