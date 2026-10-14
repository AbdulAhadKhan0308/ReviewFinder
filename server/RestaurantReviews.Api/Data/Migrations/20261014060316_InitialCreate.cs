using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace RestaurantReviews.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "cuisines",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_cuisines", x => x.id);
                });

            migrationBuilder.InsertData(
                table: "cuisines",
                columns: new[] { "id", "name" },
                values: new object[,]
                {
                    { new Guid("26713e13-c2e3-4e05-8197-834ffcdabcb7"), "Mexican" },
                    { new Guid("2f5be948-bc80-4bd6-b7ed-ede6fc43aa5d"), "Greek" },
                    { new Guid("38f44788-1dbb-4277-b9d1-2a8d85e7d0ff"), "Indian" },
                    { new Guid("58298bfa-1416-4d5f-8076-30269aed9585"), "Japanese" },
                    { new Guid("7157e537-024e-4320-b2ef-2df90cc2e498"), "French" },
                    { new Guid("9a767af2-a360-47dd-86d4-a3e6a08bdab6"), "Italian" },
                    { new Guid("ef93df41-c67e-4615-a605-4f8ca8893b67"), "Chinese" }
                });

            migrationBuilder.CreateIndex(
                name: "ix_cuisines_name",
                table: "cuisines",
                column: "name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "cuisines");
        }
    }
}
