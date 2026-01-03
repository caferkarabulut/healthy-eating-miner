"""
Warning Engine - Deterministic Feedback System (Phase 8.5.3)

Bu modül, kullanıcının günlük verilerine dayanarak deterministik (sabit kurallı)
uyarılar ve geri bildirimler üretir. AI yorumu İÇERMEZ. Saf matematik ve mantık.

Kurallar:
1. Kalori: Hedef+300 (Aşırı), Hedef-500 (Yetersiz)
2. Protein: Hedef*0.8 (Yetersiz), Hedef*1.4 (Yüksek)
3. Aktivite: <4000 (Düşük), >12000 (Süper)
"""

from typing import List, Dict

def generate_daily_warnings(
    target_kcal: int,
    consumed_kcal: int,
    protein_target: int,
    consumed_protein: int,
    steps: int
) -> List[Dict[str, str]]:
    """
    Günlük verileri analiz et ve uyarı listesi döndür.
    Return format: [{"type": "warning|info|success", "message": "..."}]
    """
    warnings = []

    # 1. Kalori Analizi
    if target_kcal > 0:
        if consumed_kcal > (target_kcal + 300):
            warnings.append({
                "type": "warning",
                "message": f"⚠️ Hedef kalorini aştın (+{consumed_kcal - target_kcal} kcal)"
            })
        elif consumed_kcal < (target_kcal - 500) and consumed_kcal > 0:
            # Sadece veri girilmişse uyar (0 ise henüz gün başıdır)
            warnings.append({
                "type": "warning",
                "message": "⚠️ Bugün çok düşük kalori aldın, enerjin düşebilir."
            })
        elif abs(consumed_kcal - target_kcal) <= 100:
            warnings.append({
                "type": "success",
                "message": "✅ Tam hedefindesin! Harika."
            })

    # 2. Protein Analizi
    if protein_target > 0:
        if consumed_protein < (protein_target * 0.8) and consumed_protein > 0:
            warnings.append({
                "type": "warning",
                "message": f"⚠️ Protein hedefin altında ({consumed_protein}g / {protein_target}g). Kas kaybı riski."
            })
        elif consumed_protein > (protein_target * 1.4):
            warnings.append({
                "type": "info",
                "message": "ℹ️ Protein alımın oldukça yüksek. Bol su içmeyi unutma."
            })
        elif consumed_protein >= protein_target:
             warnings.append({
                "type": "success",
                "message": "💪 Protein hedefini tutturdun!"
            })

    # 3. Aktivite Analizi
    if steps < 4000:
        warnings.append({
            "type": "warning",
            "message": "⚠️ Bugün hareketin çok düşük. Biraz yürüyüş iyi gelebilir."
        })
    elif steps > 12000:
        warnings.append({
            "type": "success",
            "message": "🔥 Harika bir aktivite günü! Hedefi parçaladın."
        })
    elif steps >= 8000:
         warnings.append({
            "type": "success",
            "message": "✅ Günlük adım hedefine ulaştın."
        })

    return warnings
