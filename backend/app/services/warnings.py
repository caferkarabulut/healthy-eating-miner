from typing import List, Dict


def generate_daily_warnings(
    target_kcal: int,
    consumed_kcal: int,
    protein_target: int,
    consumed_protein: int,
    steps: int
) -> List[Dict[str, str]]:
    warnings = []

    if target_kcal > 0:
        if consumed_kcal > (target_kcal + 300):
            warnings.append({
                "type": "warning",
                "message": f"⚠️ You exceeded your calorie target (+{consumed_kcal - target_kcal} kcal)"
            })
        elif consumed_kcal < (target_kcal - 500) and consumed_kcal > 0:
            warnings.append({
                "type": "warning",
                "message": "⚠️ Very low calorie intake today. Your energy might drop."
            })
        elif abs(consumed_kcal - target_kcal) <= 100:
            warnings.append({
                "type": "success",
                "message": "✅ Right on target! Great job."
            })

    if protein_target > 0:
        if consumed_protein < (protein_target * 0.8) and consumed_protein > 0:
            warnings.append({
                "type": "warning",
                "message": f"⚠️ Below protein target ({consumed_protein}g / {protein_target}g). Risk of muscle loss."
            })
        elif consumed_protein > (protein_target * 1.4):
            warnings.append({
                "type": "info",
                "message": "ℹ️ Protein intake is quite high. Stay hydrated."
            })
        elif consumed_protein >= protein_target:
            warnings.append({
                "type": "success",
                "message": "💪 Protein target reached!"
            })

    if steps < 4000:
        warnings.append({
            "type": "warning",
            "message": "⚠️ Very low activity today. A short walk might help."
        })
    elif steps > 12000:
        warnings.append({
            "type": "success",
            "message": "🔥 Amazing activity day! You crushed it."
        })
    elif steps >= 8000:
        warnings.append({
            "type": "success",
            "message": "✅ Daily step goal reached."
        })

    return warnings
