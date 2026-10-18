using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using RestaurantReviews.Api.Data;

namespace RestaurantReviews.Api.Controllers;

// Request types use properties rather than positional parameters so validation errors
// are keyed by JSON property name ("email"), matching what the client sends.
public record RegisterRequest
{
    [Required(ErrorMessage = "Enter your email address.")]
    [EmailAddress(ErrorMessage = "Enter a valid email address.")]
    [MaxLength(254, ErrorMessage = "Email must be 254 characters or fewer.")]
    public string Email { get; init; } = "";

    [Required(ErrorMessage = "Enter a password.")]
    [StringLength(128, MinimumLength = 8, ErrorMessage = "Password must be 8 to 128 characters.")]
    public string Password { get; init; } = "";

    [Required(ErrorMessage = "Enter a display name.")]
    [MaxLength(50, ErrorMessage = "Display name must be 50 characters or fewer.")]
    public string DisplayName { get; init; } = "";

    [Required(ErrorMessage = "Choose a role.")]
    [AllowedValues(nameof(UserRole.Reviewer), nameof(UserRole.Owner), ErrorMessage = "Role must be Reviewer or Owner.")]
    public string Role { get; init; } = "";
}

public record LoginRequest
{
    [Required(ErrorMessage = "Enter your email address.")]
    [MaxLength(254, ErrorMessage = "Email must be 254 characters or fewer.")]
    public string Email { get; init; } = "";

    // The length cap stops oversized inputs from reaching the password hasher.
    [Required(ErrorMessage = "Enter your password.")]
    [MaxLength(128, ErrorMessage = "Password must be 128 characters or fewer.")]
    public string Password { get; init; } = "";
}

public record MeResponse(Guid Id, string Email, string DisplayName, string Role);

[ApiController]
[Route("api/auth")]
[Authorize]
public class AuthController(
    UserManager<AppUser> userManager,
    SignInManager<AppUser> signInManager,
    IAntiforgery antiforgery) : ControllerBase
{
    private const string CsrfCookieName = "XSRF-TOKEN";

    // The app copies this cookie's value into the X-XSRF-TOKEN header on requests that change data.
    // Tokens are tied to the signed-in user, so the app calls this again after signing in or out.
    [HttpGet("csrf")]
    [AllowAnonymous]
    public NoContentResult GetCsrfToken()
    {
        var tokens = antiforgery.GetAndStoreTokens(HttpContext);
        Response.Cookies.Append(CsrfCookieName, tokens.RequestToken!, new CookieOptions
        {
            HttpOnly = false,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Strict,
            Path = "/",
        });
        return NoContent();
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        var email = request.Email.Trim();
        var user = AppUser.Create(email, request.DisplayName.Trim(), Enum.Parse<UserRole>(request.Role));

        IdentityResult result;
        try
        {
            result = await userManager.CreateAsync(user, request.Password);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            // Two registrations with the same email raced past Identity's duplicate check.
            result = IdentityResult.Failed(userManager.ErrorDescriber.DuplicateEmail(email));
        }

        if (!result.Succeeded)
        {
            return ValidationProblem(ToModelState(result.Errors));
        }

        return StatusCode(StatusCodes.Status201Created);
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<MeResponse>> Login(LoginRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email.Trim());
        if (user is null)
        {
            return InvalidCredentials();
        }

        var result = await signInManager.PasswordSignInAsync(user, request.Password, isPersistent: true, lockoutOnFailure: true);
        if (result.IsLockedOut)
        {
            return Problem(
                statusCode: StatusCodes.Status401Unauthorized,
                title: "Too many failed sign-in attempts. Try again in a few minutes.");
        }

        if (!result.Succeeded)
        {
            return InvalidCredentials();
        }

        return ToMe(user);
    }

    [HttpPost("logout")]
    public async Task<NoContentResult> Logout()
    {
        await signInManager.SignOutAsync();
        return NoContent();
    }

    [HttpGet("me")]
    public async Task<ActionResult<MeResponse>> GetMe()
    {
        var user = await userManager.GetUserAsync(User);
        if (user is null)
        {
            // The account behind a still-valid cookie no longer exists.
            await signInManager.SignOutAsync();
            return Unauthorized();
        }

        return ToMe(user);
    }

    private ObjectResult InvalidCredentials() =>
        Problem(statusCode: StatusCodes.Status401Unauthorized, title: "Incorrect email or password.");

    private static MeResponse ToMe(AppUser user) =>
        new(user.Id, user.Email!, user.DisplayName, user.Role.ToString());

    private static ModelStateDictionary ToModelState(IEnumerable<IdentityError> errors)
    {
        var modelState = new ModelStateDictionary();
        foreach (var error in errors)
        {
            var (field, message) = error.Code switch
            {
                nameof(IdentityErrorDescriber.DuplicateEmail) => ("email", "An account with this email already exists."),
                nameof(IdentityErrorDescriber.InvalidEmail) => ("email", "Enter a valid email address."),
                _ when error.Code.StartsWith("Password", StringComparison.Ordinal) => ("password", error.Description),
                _ => (string.Empty, error.Description),
            };
            modelState.AddModelError(field, message);
        }

        return modelState;
    }
}
