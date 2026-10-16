using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BiteRoutine.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDiaryPortionSnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "portion",
                table: "diary_entries",
                type: "jsonb",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "portion",
                table: "diary_entries");
        }
    }
}
