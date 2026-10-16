using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantReviews.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRestaurantImages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "image_key",
                table: "restaurants");

            migrationBuilder.CreateTable(
                name: "restaurant_images",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    restaurant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    content_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    data = table.Column<byte[]>(type: "bytea", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_restaurant_images", x => x.id);
                    table.ForeignKey(
                        name: "fk_restaurant_images_restaurants_restaurant_id",
                        column: x => x.restaurant_id,
                        principalTable: "restaurants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_restaurant_images_restaurant_id",
                table: "restaurant_images",
                column: "restaurant_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "restaurant_images");

            migrationBuilder.AddColumn<string>(
                name: "image_key",
                table: "restaurants",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);
        }
    }
}
