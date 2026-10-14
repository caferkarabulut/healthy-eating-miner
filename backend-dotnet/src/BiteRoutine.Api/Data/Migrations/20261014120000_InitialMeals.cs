using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

namespace BiteRoutine.Api.Data.Migrations;

[DbContext(typeof(BiteRoutineDbContext))]
[Migration("20261014120000_InitialMeals")]
public sealed class InitialMeals : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("CREATE COLLATION IF NOT EXISTS bite_routine_tr (provider = icu, locale = 'tr-TR', deterministic = true);");

        migrationBuilder.CreateTable(
            name: "meals",
            columns: table => new
            {
                meal_id = table.Column<int>(type: "integer", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                meal_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false, collation: "bite_routine_tr"),
                cuisine = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                meal_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
            },
            constraints: table => table.PrimaryKey("pk_meals", x => x.meal_id));
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "meals");
        migrationBuilder.Sql("DROP COLLATION IF EXISTS bite_routine_tr;");
    }

    protected override void BuildTargetModel(ModelBuilder modelBuilder)
    {
        BiteRoutineDbContextModelSnapshot.BuildMealModel(modelBuilder);
    }
}
