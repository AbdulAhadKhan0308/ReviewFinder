using System.Security.Claims;

namespace RestaurantReviews.Api.Auth;

public static class ClaimsPrincipalExtensions
{
    // The signed-in user's ID, taken from the sign-in cookie, never from the request.
    public static Guid GetUserId(this ClaimsPrincipal user) =>
        Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("The signed-in user has no ID claim."));
}
