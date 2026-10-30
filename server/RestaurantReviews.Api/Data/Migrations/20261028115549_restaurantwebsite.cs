using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantReviews.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class restaurantwebsite : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "website",
                table: "restaurants",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "website",
                table: "restaurants");
        }
    }
}
