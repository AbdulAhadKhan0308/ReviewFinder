using Microsoft.EntityFrameworkCore;

namespace RestaurantReviews.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Cuisine> Cuisines => Set<Cuisine>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
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
    }
}
