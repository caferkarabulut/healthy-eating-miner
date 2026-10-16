using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace BiteRoutine.Api.Data;

public sealed class BiteRoutineDbContext(DbContextOptions<BiteRoutineDbContext> options) : IdentityUserContext<IdentityUser>(options)
{
    public DbSet<FoodPortion> FoodPortions => Set<FoodPortion>();
    public DbSet<Meal> Meals => Set<Meal>();
    public DbSet<DiaryEntry> DiaryEntries => Set<DiaryEntry>();
    public DbSet<FavoriteMeal> FavoriteMeals => Set<FavoriteMeal>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<FoodPortion>(entity =>
        {
            entity.ToTable("food_portions", table =>
            {
                table.HasCheckConstraint("ck_food_portions_positive", "amount > 0 AND gram_weight > 0");
            });
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.MealId).HasColumnName("meal_id");
            entity.Property(x => x.MeasureName).HasColumnName("measure_name").HasMaxLength(300);
            entity.Property(x => x.Amount).HasColumnName("amount").HasPrecision(18, 8);
            entity.Property(x => x.GramWeight).HasColumnName("gram_weight").HasPrecision(18, 8);
            entity.Property(x => x.Source).HasColumnName("source").HasMaxLength(100);
            entity.Property(x => x.SourceFoodId).HasColumnName("source_food_id").HasMaxLength(40);
            entity.Property(x => x.SourceId).HasColumnName("source_id").HasMaxLength(40);
            entity.Property(x => x.SourceDescription).HasColumnName("source_description").HasMaxLength(500);
            entity.Property(x => x.SourceUrl).HasColumnName("source_url").HasMaxLength(500);
            entity.HasIndex(x => new { x.Source, x.SourceId }).IsUnique();
            entity.HasOne<Meal>().WithMany().HasForeignKey(x => x.MealId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<FavoriteMeal>(entity =>
        {
            entity.ToTable("favorite_meals");
            entity.HasKey(x => new { x.UserId, x.MealId });
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.MealId).HasColumnName("meal_id");
            entity.HasOne<IdentityUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<Meal>().WithMany().HasForeignKey(x => x.MealId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<DiaryEntry>(entity =>
        {
            entity.OwnsOne(x => x.Portion, owned => owned.ToJson("portion"));
            entity.ToTable("diary_entries", table =>
            {
                table.HasCheckConstraint("ck_diary_entries_grams", "grams >= 0.01 AND grams <= 10000");
                table.HasCheckConstraint("ck_diary_entries_meal_slot", "meal_slot IN ('breakfast', 'lunch', 'dinner', 'snack', 'other')");
            });
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.UserId).HasColumnName("user_id").IsRequired();
            entity.Property(x => x.MealId).HasColumnName("meal_id");
            entity.Property(x => x.Date).HasColumnName("date");
            entity.Property(x => x.MealSlot).HasColumnName("meal_slot").HasMaxLength(16).HasDefaultValue("other").IsRequired();
            entity.Property(x => x.Grams).HasColumnName("grams").HasPrecision(8, 2);
            entity.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(x => x.MealName).HasColumnName("meal_name").HasMaxLength(200).IsRequired();
            entity.Property(x => x.CaloriesKcalPer100G).HasColumnName("calories_kcal_per_100g").HasPrecision(8, 2);
            entity.Property(x => x.ProteinGPer100G).HasColumnName("protein_g_per_100g").HasPrecision(8, 2);
            entity.Property(x => x.CarbsGPer100G).HasColumnName("carbs_g_per_100g").HasPrecision(8, 2);
            entity.Property(x => x.FatGPer100G).HasColumnName("fat_g_per_100g").HasPrecision(8, 2);
            entity.Property(x => x.Source).HasColumnName("source").HasMaxLength(100);
            entity.Property(x => x.SourceId).HasColumnName("source_id").HasMaxLength(100);
            entity.Property(x => x.SourceUrl).HasColumnName("source_url").HasMaxLength(500);
            entity.HasOne<IdentityUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<Meal>().WithMany().HasForeignKey(x => x.MealId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => new { x.UserId, x.Date });
        });

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
