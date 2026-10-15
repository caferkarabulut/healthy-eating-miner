using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BiteRoutine.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDiaryEntries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "diary_entries",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    meal_id = table.Column<int>(type: "integer", nullable: false),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    grams = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    meal_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    calories_kcal_per_100g = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: true),
                    protein_g_per_100g = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: true),
                    carbs_g_per_100g = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: true),
                    fat_g_per_100g = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: true),
                    source = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    source_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    source_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_diary_entries", x => x.id);
                    table.CheckConstraint("ck_diary_entries_grams", "grams >= 0.01 AND grams <= 10000");
                    table.ForeignKey(
                        name: "FK_diary_entries_AspNetUsers_user_id",
                        column: x => x.user_id,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_diary_entries_meals_meal_id",
                        column: x => x.meal_id,
                        principalTable: "meals",
                        principalColumn: "meal_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_diary_entries_meal_id",
                table: "diary_entries",
                column: "meal_id");

            migrationBuilder.CreateIndex(
                name: "IX_diary_entries_user_id_date",
                table: "diary_entries",
                columns: new[] { "user_id", "date" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "diary_entries");
        }
    }
}
