using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

namespace BiteRoutine.Api.Data.Migrations;

[DbContext(typeof(BiteRoutineDbContext))]
public sealed class BiteRoutineDbContextModelSnapshot : ModelSnapshot
{
    protected override void BuildModel(ModelBuilder modelBuilder) => BuildMealModel(modelBuilder);

    internal static void BuildMealModel(ModelBuilder modelBuilder)
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
