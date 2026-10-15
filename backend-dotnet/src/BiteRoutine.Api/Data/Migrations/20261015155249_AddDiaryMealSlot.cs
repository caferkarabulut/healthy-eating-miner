using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BiteRoutine.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDiaryMealSlot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "meal_slot",
                table: "diary_entries",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "other");

            migrationBuilder.AddCheckConstraint(
                name: "ck_diary_entries_meal_slot",
                table: "diary_entries",
                sql: "meal_slot IN ('breakfast', 'lunch', 'dinner', 'snack', 'other')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_diary_entries_meal_slot",
                table: "diary_entries");

            migrationBuilder.DropColumn(
                name: "meal_slot",
                table: "diary_entries");
        }
    }
}
