using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using RestaurantReviews.Api.Data;

namespace RestaurantReviews.Api.Auth;

// Puts the account's role in the sign-in cookie so [Authorize(Roles = ...)] works without a database lookup.
public class AppUserClaimsPrincipalFactory(UserManager<AppUser> userManager, IOptions<IdentityOptions> options)
    : UserClaimsPrincipalFactory<AppUser>(userManager, options)
{
    protected override async Task<ClaimsIdentity> GenerateClaimsAsync(AppUser user)
    {
        var identity = await base.GenerateClaimsAsync(user);
        identity.AddClaim(new Claim(identity.RoleClaimType, user.Role.ToString()));
        return identity;
    }
}
