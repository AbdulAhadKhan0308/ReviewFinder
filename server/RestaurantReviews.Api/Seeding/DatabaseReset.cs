using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using Npgsql;
using RestaurantReviews.Api.Data;
using RestaurantReviews.Api.Images;

namespace RestaurantReviews.Api.Seeding;

// Wipes the database, recreates the schema from the migrations, and adds the demo data in DemoData.
// Run with: dotnet run --project server/RestaurantReviews.Api -- reset-db
public static class DatabaseReset
{
    public const string Command = "reset-db";

    public static async Task<int> RunAsync(WebApplication app)
    {
        if (!app.Environment.IsDevelopment())
        {
            Console.Error.WriteLine($"{Command} deletes all data, so it only runs in the Development environment.");
            return 1;
        }

        await using var scope = app.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var target = new NpgsqlConnectionStringBuilder(db.Database.GetConnectionString());

        try
        {
            Console.WriteLine($"Resetting database '{target.Database}' on {target.Host}:{target.Port}...");
            await RecreateSchemaAsync(db);
            var counts = await SeedAsync(db, userManager);
            PrintSummary(target.Database!, counts);
            return 0;
        }
        catch (Exception ex) when (FindDatabaseError(ex) is { } databaseError)
        {
            Console.Error.WriteLine($"Couldn't reset the database: {databaseError.Message}");
            Console.Error.WriteLine("Is PostgreSQL running? Start it with: docker compose up -d");
            return 1;
        }
    }

    // EF Core wraps connection failures, for example in "likely due to a transient failure" errors.
    private static NpgsqlException? FindDatabaseError(Exception? ex) =>
        ex switch
        {
            null => null,
            NpgsqlException npgsql => npgsql,
            _ => FindDatabaseError(ex.InnerException),
        };

    // Drops the schema rather than the database, so it works while other connections are open,
    // for example from a running copy of the API. A missing database is created by the migrations.
    private static async Task RecreateSchemaAsync(AppDbContext db)
    {
        if (await db.Database.GetService<IRelationalDatabaseCreator>().ExistsAsync())
        {
            await db.Database.ExecuteSqlRawAsync("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
        }

        await db.Database.MigrateAsync();
    }

    private static async Task<Dictionary<string, (AppUser User, int Restaurants, int Reviews)>> SeedAsync(
        AppDbContext db,
        UserManager<AppUser> userManager)
    {
        var now = DateTime.UtcNow;
        var users = new Dictionary<string, (AppUser User, int Restaurants, int Reviews)>();
        foreach (var account in DemoData.Accounts)
        {
            var user = AppUser.Create(account.Email, account.DisplayName, account.Role);
            user.CreatedAt = now.AddDays(-100);
            var result = await userManager.CreateAsync(user, DemoData.Password);
            if (!result.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Couldn't create {account.Email}: {string.Join(" ", result.Errors.Select(e => e.Description))}");
            }

            users[account.Key] = (user, 0, 0);
        }

        var cuisines = await db.Cuisines.ToDictionaryAsync(c => c.Name);
        foreach (var seed in DemoData.Restaurants)
        {
            var createdAt = now.AddDays(-seed.DaysAgo);
            var restaurant = new Restaurant
            {
                Id = Guid.CreateVersion7(),
                OwnerId = users[seed.Owner].User.Id,
                Title = seed.Title,
                Location = seed.Location,
                Description = seed.Description,
                Cuisines = [.. seed.Cuisines.Select(name => cuisines[name])],
                Image = seed.Image is null ? null : LoadImage(seed.Image),
                CreatedAt = createdAt,
                UpdatedAt = createdAt,
            };

            foreach (var (review, index) in seed.Reviews.Select((r, i) => (r, i)))
            {
                if (review.DaysAgo >= seed.DaysAgo)
                {
                    throw new InvalidOperationException($"A review of {seed.Title} is older than the restaurant.");
                }

                // A few minutes apart, so reviews written on the same day still have a clear order.
                var writtenAt = now.AddDays(-review.DaysAgo).AddMinutes(-index * 7);
                restaurant.Reviews.Add(new Review
                {
                    Id = Guid.CreateVersion7(),
                    ReviewerId = users[review.Reviewer].User.Id,
                    Rating = (short)review.Rating,
                    Text = review.Text,
                    CreatedAt = writtenAt,
                    UpdatedAt = review.EditedDaysAgo is { } edited ? now.AddDays(-edited) : writtenAt,
                });
                users[review.Reviewer] = users[review.Reviewer] with { Reviews = users[review.Reviewer].Reviews + 1 };
            }

            db.Restaurants.Add(restaurant);
            users[seed.Owner] = users[seed.Owner] with { Restaurants = users[seed.Owner].Restaurants + 1 };
        }

        await db.SaveChangesAsync();
        return users;
    }

    // Demo images go through the same checks as uploaded ones.
    private static RestaurantImage LoadImage(string fileName)
    {
        using var stream = typeof(DatabaseReset).Assembly.GetManifestResourceStream($"SeedImages/{fileName}")
            ?? throw new InvalidOperationException($"Demo image {fileName} is missing from Seeding/Images.");
        using var buffer = new MemoryStream();
        stream.CopyTo(buffer);
        if (!ImageFile.TryDecode(Convert.ToBase64String(buffer.ToArray()), out var image, out var error))
        {
            throw new InvalidOperationException($"Demo image {fileName} isn't usable: {error}");
        }

        return new RestaurantImage { Id = Guid.CreateVersion7(), ContentType = image.ContentType, Data = image.Bytes };
    }

    private static void PrintSummary(string database, Dictionary<string, (AppUser User, int Restaurants, int Reviews)> users)
    {
        var restaurants = users.Values.Sum(u => u.Restaurants);
        var reviews = users.Values.Sum(u => u.Reviews);
        Console.WriteLine($"Done: database '{database}' now has {restaurants} restaurants and {reviews} reviews.");
        Console.WriteLine();
        Console.WriteLine($"Demo accounts (password for all: {DemoData.Password})");
        Console.WriteLine();
        Console.WriteLine($"  {"Role",-18}{"Email",-28}{"Name",-9}Data");
        foreach (var (user, ownRestaurants, ownReviews) in users.Values.OrderByDescending(u => u.User.Role))
        {
            var (role, data) = user.Role == UserRole.Owner
                ? ("Restaurant owner", $"{ownRestaurants} restaurants")
                : ("Reviewer", $"{ownReviews} reviews");
            Console.WriteLine($"  {role,-18}{user.Email,-28}{user.DisplayName,-9}{data}");
        }
    }
}
