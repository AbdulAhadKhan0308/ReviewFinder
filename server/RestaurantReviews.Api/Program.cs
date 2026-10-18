using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.ModelBinding.Metadata;
using Microsoft.EntityFrameworkCore;
using RestaurantReviews.Api.Auth;
using RestaurantReviews.Api.Data;
using RestaurantReviews.Api.Seeding;

var builder = WebApplication.CreateBuilder(args);

// "reset-db" recreates the database with demo data instead of starting the server.
var resetDatabase = args.Contains(DatabaseReset.Command);
if (resetDatabase)
{
    // Keeps the console to the summary and demo accounts, without every SQL command.
    builder.Logging.AddFilter("Microsoft.EntityFrameworkCore", LogLevel.Warning);
    // Starting from an empty database makes EF Core log expected errors: the database or its migration history
    // table doesn't exist yet. Real failures still stop the command with an error.
    builder.Logging.AddFilter("Microsoft.EntityFrameworkCore.Database", LogLevel.None);
}

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("Connection string 'Default' is not configured.");

// In development the API runs on plain HTTP behind the Vite dev server's proxy.
var cookieSecurePolicy = builder.Environment.IsDevelopment()
    ? CookieSecurePolicy.SameAsRequest
    : CookieSecurePolicy.Always;

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString).UseSnakeCaseNamingConvention());

// Sign-in cookies and CSRF tokens are encrypted with Data Protection keys. By default the keys are kept on the
// machine, so a replaced container signs everyone out and separate containers can't read each other's cookies.
// When this path is set (in AWS), the keys are shared through SSM Parameter Store instead.
var keysParameterPath = builder.Configuration["DataProtection:ParameterStorePath"];
if (!string.IsNullOrEmpty(keysParameterPath))
{
    builder.Services.AddDataProtection()
        .SetApplicationName("RestaurantReviews")
        .PersistKeysToAWSSystemsManager(keysParameterPath);
}

// The Dockerfile turns on forwarded headers, so the app learns from the proxy in front of it whether the visitor used
// HTTPS (needed for Secure cookies, CSRF protection and HSTS). Behind CloudFront, the load balancer only sees plain
// HTTP from CloudFront, so its X-Forwarded-Proto says "http"; CloudFront's own header carries the visitor's scheme.
var forwardedProtoHeader = builder.Configuration["ForwardedHeaders:ProtoHeaderName"];
if (!string.IsNullOrEmpty(forwardedProtoHeader))
{
    builder.Services.Configure<ForwardedHeadersOptions>(options => options.ForwardedProtoHeaderName = forwardedProtoHeader);
}

builder.Services.AddAuthentication(IdentityConstants.ApplicationScheme)
    .AddIdentityCookies();
builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = cookieSecurePolicy;
    options.ExpireTimeSpan = TimeSpan.FromDays(7);
    options.SlidingExpiration = true;
    // This is an API, so answer with status codes instead of redirecting to a sign-in page.
    options.Events.OnRedirectToLogin = context =>
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    };
    options.Events.OnRedirectToAccessDenied = context =>
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    };
});
builder.Services.AddIdentityCore<AppUser>(options =>
    {
        options.User.RequireUniqueEmail = true;
        options.Password.RequiredLength = 8;
        options.Password.RequireDigit = false;
        options.Password.RequireLowercase = false;
        options.Password.RequireUppercase = false;
        options.Password.RequireNonAlphanumeric = false;
        options.Password.RequiredUniqueChars = 1;
        options.Lockout.AllowedForNewUsers = true;
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
    })
    .AddEntityFrameworkStores<AppDbContext>()
    .AddSignInManager()
    .AddClaimsPrincipalFactory<AppUserClaimsPrincipalFactory>();

builder.Services.AddAuthorizationBuilder()
    .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-XSRF-TOKEN";
    options.Cookie.SecurePolicy = cookieSecurePolicy;
});

builder.Services.AddControllers(options =>
{
    // Requests that change data (anything but GET, HEAD, OPTIONS and TRACE) must carry a valid CSRF token.
    options.Filters.Add<AntiforgeryValidationFilter>();
    // Validation errors are keyed by JSON property names ("email"), matching what the client sends.
    options.ModelMetadataDetailsProviders.Add(new SystemTextJsonValidationMetadataProvider());
});
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();
builder.Services.AddHealthChecks();

var app = builder.Build();

if (resetDatabase)
{
    Environment.ExitCode = await DatabaseReset.RunAsync(app);
    return;
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi().AllowAnonymous();
}
else
{
    app.UseExceptionHandler();
    // HTTPS ends in front of the app (CloudFront, or an HTTPS load balancer), so the app itself receives plain HTTP.
    // The original scheme arrives in a forwarded header; see ForwardedHeaders above and the Dockerfile.
    app.UseHsts();
}

// Gives empty error responses, such as 401 from the cookie handler, a ProblemDetails body.
app.UseStatusCodePages();

// Outside development, the API also serves the React build, which the Dockerfile copies into wwwroot.
// In development, the Vite dev server serves it instead.
var serveClient = !app.Environment.IsDevelopment();
var clientFiles = new StaticFileOptions
{
    OnPrepareResponse = context =>
    {
        // Vite puts a content hash in every file name under /assets, so those files never change. Everything else,
        // index.html above all, is checked on each load, so a new deploy takes effect straight away.
        context.Context.Response.Headers.CacheControl = context.Context.Request.Path.StartsWithSegments("/assets")
            ? "public, max-age=31536000, immutable"
            : "no-cache";
    },
};
if (serveClient)
{
    // Before routing and the sign-in checks: the app's own files load for signed-out users, and a real file is never
    // captured by the 404 route for missing files below. Without an explicit UseRouting, routes are matched first and
    // static files skip any request that already matched one.
    app.UseStaticFiles(clientFiles);
}

app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health").AllowAnonymous();

if (serveClient)
{
    // Unknown API paths and missing files are 404s, rather than the app's HTML page or a sign-in error.
    app.Map("/api/{**path}", () => Results.NotFound()).AllowAnonymous();
    app.Map("{**path:file}", () => Results.NotFound()).AllowAnonymous();
    // Any other path is a React route, such as /restaurants/123.
    app.MapFallbackToFile("index.html", clientFiles).AllowAnonymous();
}

app.Run();
