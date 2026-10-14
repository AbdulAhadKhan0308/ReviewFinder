using Microsoft.EntityFrameworkCore;
using RestaurantReviews.Api.Data;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("Connection string 'Default' is not configured.");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString).UseSnakeCaseNamingConvention());
builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else
{
    // In development the API runs on plain HTTP behind the Vite dev server's proxy.
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseAuthorization();

app.MapControllers();

app.Run();
