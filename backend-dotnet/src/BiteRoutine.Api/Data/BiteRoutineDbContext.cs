using Microsoft.EntityFrameworkCore;

namespace BiteRoutine.Api.Data;

public sealed class BiteRoutineDbContext(DbContextOptions<BiteRoutineDbContext> options) : DbContext(options)
{
    public DbSet<Meal> Meals => Set<Meal>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Turkish casing (I/ı and İ/i) must follow Turkish rules in meal-name searches.
        modelBuilder.HasCollation("bite_routine_tr", locale: "tr-TR", provider: "icu", deterministic: true);

        modelBuilder.Entity<Meal>(entity =>
        {
            entity.ToTable("meals");
            entity.HasKey(meal => meal.MealId).HasName("pk_meals");
            entity.Property(meal => meal.MealId).HasColumnName("meal_id").UseIdentityByDefaultColumn();
            entity.Property(meal => meal.MealName).HasColumnName("meal_name")
                .HasMaxLength(200).UseCollation("bite_routine_tr").IsRequired();
            entity.Property(meal => meal.Cuisine).HasColumnName("cuisine").HasMaxLength(100);
            entity.Property(meal => meal.MealType).HasColumnName("meal_type").HasMaxLength(100);
            entity.Property(meal => meal.CaloriesKcalPer100G).HasColumnName("calories_kcal_per_100g").HasPrecision(8, 2);
            entity.Property(meal => meal.ProteinGPer100G).HasColumnName("protein_g_per_100g").HasPrecision(8, 2);
            entity.Property(meal => meal.CarbsGPer100G).HasColumnName("carbs_g_per_100g").HasPrecision(8, 2);
            entity.Property(meal => meal.FatGPer100G).HasColumnName("fat_g_per_100g").HasPrecision(8, 2);
            entity.Property(meal => meal.NutritionSource).HasColumnName("nutrition_source").HasMaxLength(100);
            entity.Property(meal => meal.NutritionSourceId).HasColumnName("nutrition_source_id").HasMaxLength(100);
            entity.Property(meal => meal.NutritionSourceUrl).HasColumnName("nutrition_source_url").HasMaxLength(500);
            entity.HasIndex(meal => new { meal.NutritionSource, meal.NutritionSourceId }).IsUnique();
        });
    }
}
