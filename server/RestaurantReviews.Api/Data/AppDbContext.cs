using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace RestaurantReviews.Api.Data;

// IdentityUserContext adds Identity's user tables without its role tables; each user's role is a column instead.
public class AppDbContext(DbContextOptions<AppDbContext> options) : IdentityUserContext<AppUser, Guid>(options)
{
    public DbSet<Cuisine> Cuisines => Set<Cuisine>();
    public DbSet<Restaurant> Restaurants => Set<Restaurant>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<AppUser>(user =>
        {
            user.ToTable("users");
            user.Property(u => u.DisplayName).HasMaxLength(50);
            user.Property(u => u.Role).HasConversion<string>().HasMaxLength(20);
            // One account per email for now. Allowing one account per email and role later means
            // replacing this with a unique index on (NormalizedEmail, Role).
            user.HasIndex(u => u.NormalizedEmail).IsUnique().HasDatabaseName("ix_users_normalized_email");
            user.HasIndex(u => u.NormalizedUserName).HasDatabaseName("ix_users_normalized_user_name");
        });
        modelBuilder.Entity<IdentityUserClaim<Guid>>().ToTable("user_claims");
        modelBuilder.Entity<IdentityUserLogin<Guid>>().ToTable("user_logins");
        modelBuilder.Entity<IdentityUserToken<Guid>>().ToTable("user_tokens");

        // ICU level 2 ignores case but still distinguishes accents.
        modelBuilder.HasCollation("case_insensitive", locale: "und-u-ks-level2", provider: "icu", deterministic: false);

        modelBuilder.Entity<Cuisine>(cuisine =>
        {
            cuisine.Property(c => c.Name).HasMaxLength(50).UseCollation("case_insensitive");
            cuisine.HasIndex(c => c.Name).IsUnique();
            cuisine.HasData(
                new Cuisine { Id = Guid.Parse("9a767af2-a360-47dd-86d4-a3e6a08bdab6"), Name = "Italian" },
                new Cuisine { Id = Guid.Parse("7157e537-024e-4320-b2ef-2df90cc2e498"), Name = "French" },
                new Cuisine { Id = Guid.Parse("ef93df41-c67e-4615-a605-4f8ca8893b67"), Name = "Chinese" },
                new Cuisine { Id = Guid.Parse("58298bfa-1416-4d5f-8076-30269aed9585"), Name = "Japanese" },
                new Cuisine { Id = Guid.Parse("38f44788-1dbb-4277-b9d1-2a8d85e7d0ff"), Name = "Indian" },
                new Cuisine { Id = Guid.Parse("26713e13-c2e3-4e05-8197-834ffcdabcb7"), Name = "Mexican" },
                new Cuisine { Id = Guid.Parse("2f5be948-bc80-4bd6-b7ed-ede6fc43aa5d"), Name = "Greek" });
        });

        modelBuilder.Entity<Restaurant>(restaurant =>
        {
            restaurant.Property(r => r.Title).HasMaxLength(100);
            restaurant.Property(r => r.Location).HasMaxLength(200);
            restaurant.Property(r => r.Description).HasMaxLength(2000);
            restaurant.Property(r => r.ImageKey).HasMaxLength(100);
            // Restrict: deleting an account must not silently delete its restaurants.
            restaurant.HasOne<AppUser>().WithMany().HasForeignKey(r => r.OwnerId).OnDelete(DeleteBehavior.Restrict);
            restaurant.HasIndex(r => r.OwnerId);
            restaurant.HasMany(r => r.Cuisines).WithMany().UsingEntity<RestaurantCuisine>(
                toCuisine => toCuisine.HasOne<Cuisine>().WithMany().HasForeignKey(rc => rc.CuisineId).OnDelete(DeleteBehavior.Restrict),
                toRestaurant => toRestaurant.HasOne<Restaurant>().WithMany().HasForeignKey(rc => rc.RestaurantId).OnDelete(DeleteBehavior.Cascade),
                join =>
                {
                    join.ToTable("restaurant_cuisines");
                    join.HasKey(rc => new { rc.RestaurantId, rc.CuisineId });
                });
        });
    }
}
