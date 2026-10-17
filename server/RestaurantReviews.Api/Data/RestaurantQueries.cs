using System.Security.Claims;
using RestaurantReviews.Api.Auth;

namespace RestaurantReviews.Api.Data;

public static class RestaurantQueries
{
    // Reviewers can see every restaurant; owners only see their own. Anything else is reported as not found.
    public static IQueryable<Restaurant> VisibleTo(this IQueryable<Restaurant> restaurants, ClaimsPrincipal user)
    {
        if (!user.IsInRole(nameof(UserRole.Owner)))
        {
            return restaurants;
        }

        var userId = user.GetUserId();
        return restaurants.Where(r => r.OwnerId == userId);
    }

    // Makes a keyword safe to use in a LIKE pattern by escaping its wildcard characters.
    public static string ContainsPattern(string keyword) =>
        "%" + keyword.Replace(@"\", @"\\").Replace("%", @"\%").Replace("_", @"\_") + "%";
}
