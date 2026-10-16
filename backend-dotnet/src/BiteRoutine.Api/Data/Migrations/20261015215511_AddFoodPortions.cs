using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BiteRoutine.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddFoodPortions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "food_portions",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    meal_id = table.Column<int>(type: "integer", nullable: false),
                    measure_name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    gram_weight = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    source = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    source_food_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    source_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    source_description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    source_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_food_portions", x => x.id);
                    table.CheckConstraint("ck_food_portions_positive", "amount > 0 AND gram_weight > 0");
                    table.ForeignKey(
                        name: "FK_food_portions_meals_meal_id",
                        column: x => x.meal_id,
                        principalTable: "meals",
                        principalColumn: "meal_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_food_portions_meal_id",
                table: "food_portions",
                column: "meal_id");

            migrationBuilder.CreateIndex(
                name: "IX_food_portions_source_source_id",
                table: "food_portions",
                columns: new[] { "source", "source_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "food_portions");
        }
    }
}
