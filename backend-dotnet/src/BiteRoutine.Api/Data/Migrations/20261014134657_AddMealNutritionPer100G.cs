using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BiteRoutine.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMealNutritionPer100G : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "calories_kcal_per_100g",
                table: "meals",
                type: "numeric(8,2)",
                precision: 8,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "carbs_g_per_100g",
                table: "meals",
                type: "numeric(8,2)",
                precision: 8,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "fat_g_per_100g",
                table: "meals",
                type: "numeric(8,2)",
                precision: 8,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "nutrition_source",
                table: "meals",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "nutrition_source_id",
                table: "meals",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "nutrition_source_url",
                table: "meals",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "protein_g_per_100g",
                table: "meals",
                type: "numeric(8,2)",
                precision: 8,
                scale: 2,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_meals_nutrition_source_nutrition_source_id",
                table: "meals",
                columns: new[] { "nutrition_source", "nutrition_source_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_meals_nutrition_source_nutrition_source_id",
                table: "meals");

            migrationBuilder.DropColumn(
                name: "calories_kcal_per_100g",
                table: "meals");

            migrationBuilder.DropColumn(
                name: "carbs_g_per_100g",
                table: "meals");

            migrationBuilder.DropColumn(
                name: "fat_g_per_100g",
                table: "meals");

            migrationBuilder.DropColumn(
                name: "nutrition_source",
                table: "meals");

            migrationBuilder.DropColumn(
                name: "nutrition_source_id",
                table: "meals");

            migrationBuilder.DropColumn(
                name: "nutrition_source_url",
                table: "meals");

            migrationBuilder.DropColumn(
                name: "protein_g_per_100g",
                table: "meals");
        }
    }
}
