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
        modelBuilder.HasAnnotation("ProductVersion", "10.0.13")
            .HasAnnotation("Relational:MaxIdentifierLength", 63);

        modelBuilder.HasCollation("bite_routine_tr", locale: "tr-TR", provider: "icu", deterministic: true);

        modelBuilder.Entity("BiteRoutine.Api.Data.Meal", entity =>
        {
            entity.Property<int>("MealId")
                .ValueGeneratedOnAdd()
                .HasColumnType("integer")
                .HasColumnName("meal_id")
                .HasAnnotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);
            entity.Property<string>("MealName")
                .IsRequired()
                .HasMaxLength(200)
                .HasColumnType("character varying(200)")
                .UseCollation("bite_routine_tr")
                .HasColumnName("meal_name");
            entity.Property<string>("Cuisine")
                .HasMaxLength(100)
                .HasColumnType("character varying(100)")
                .HasColumnName("cuisine");
            entity.Property<string>("MealType")
                .HasMaxLength(100)
                .HasColumnType("character varying(100)")
                .HasColumnName("meal_type");
            entity.HasKey("MealId").HasName("pk_meals");
            entity.ToTable("meals");
        });
    }
}
