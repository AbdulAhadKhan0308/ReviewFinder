using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantReviews.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class CaseInsensitiveCuisineNames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:CollationDefinition:case_insensitive", "und-u-ks-level2,und-u-ks-level2,icu,False");

            migrationBuilder.AlterColumn<string>(
                name: "name",
                table: "cuisines",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                collation: "case_insensitive",
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .OldAnnotation("Npgsql:CollationDefinition:case_insensitive", "und-u-ks-level2,und-u-ks-level2,icu,False");

            migrationBuilder.AlterColumn<string>(
                name: "name",
                table: "cuisines",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldCollation: "case_insensitive");
        }
    }
}
