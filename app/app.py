import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt

# Kolon adlarını Türkçe göstermek için çeviri sözlüğü
COLUMN_TRANSLATIONS = {
    "meal_name": "Öğün Adı",
    "cuisine": "Mutfak",
    "meal_type": "Öğün Tipi",
    "diet_type": "Diyet Türü",
    "calories": "Kalori",
    "protein_g": "Protein (g)",
    "carbs_g": "Karbonhidrat (g)",
    "fat_g": "Yağ (g)",
    "fiber_g": "Lif (g)",
    "sugar_g": "Şeker (g)",
    "sodium_mg": "Sodyum (mg)",
    "cholesterol_mg": "Kolesterol (mg)",
    "serving_size_g": "Porsiyon (g)",
    "cooking_method": "Pişirme Yöntemi",
    "prep_time_min": "Hazırlık Süresi (dk)",
    "cook_time_min": "Pişirme Süresi (dk)",
    "rating": "Puan",
    "is_healthy": "Sağlıklı mı",
}

# ---------- VERİYİ YÜKLE ----------
@st.cache_data
def load_data():
    df = pd.read_csv("data/healthy_eating_clean.csv")
    return df

@st.cache_data
def load_rules():
    # Notebook'ta kaydettiğimiz apriori kuralları
    rules_df = pd.read_csv("results/apriori_rules.csv")
    return rules_df

df = load_data()
rules_df = load_rules()

# ---------- SAYFA BAŞLIĞI ----------
st.title("Healthy Eating Miner")
st.write(
    "Bu uygulama, sağlıklı beslenme veri seti üzerinde veri madenciliği yöntemleri "
    "ve filtreleme tabanlı bir öneri sistemi sunar."
)

# ---------- SİDEBAR FİLTRELERİ (BÜTÜN TAB'LAR İÇİN ORTAK) ----------
st.sidebar.header("Filtreler")

# Kalori aralığı
min_cal = int(df["calories"].min())
max_cal = int(df["calories"].max())

calorie_range = st.sidebar.slider(
    "Kalori aralığı",
    min_value=min_cal,
    max_value=max_cal,
    value=(min_cal, 400)
)

# Diyet türü
diet_options = ["Hepsi"] + sorted(df["diet_type"].unique().tolist())
selected_diet = st.sidebar.selectbox("Diyet türü", diet_options)

# Mutfak türü
cuisine_options = ["Hepsi"] + sorted(df["cuisine"].unique().tolist())
selected_cuisine = st.sidebar.selectbox("Mutfak türü", cuisine_options)

# Pişirme yöntemi
cooking_options = ["Hepsi"] + sorted(df["cooking_method"].unique().tolist())
selected_cooking = st.sidebar.selectbox("Pişirme yöntemi", cooking_options)

# Sadece sağlıklı mı?
only_healthy = st.sidebar.checkbox(
    "Sadece sağlıklı öğünleri göster (is_healthy = 1)",
    value=True
)

# ---------- FİLTRE UYGULAMA ----------
filtered_df = df.copy()

filtered_df = filtered_df[
    (filtered_df["calories"] >= calorie_range[0]) &
    (filtered_df["calories"] <= calorie_range[1])
]

if selected_diet != "Hepsi":
    filtered_df = filtered_df[filtered_df["diet_type"] == selected_diet]

if selected_cuisine != "Hepsi":
    filtered_df = filtered_df[filtered_df["cuisine"] == selected_cuisine]

if selected_cooking != "Hepsi":
    filtered_df = filtered_df[filtered_df["cooking_method"] == selected_cooking]

if only_healthy:
    filtered_df = filtered_df[filtered_df["is_healthy"] == 1]

# ---------- TABLAR ----------
tab1, tab2, tab3 = st.tabs(["Öneri Sistemi", "Apriori Kuralları", "Öğün Detayları"])

# ================== TAB 1: ÖNERİ SİSTEMİ ==================
with tab1:
    st.subheader("Filtre Sonuç Özeti")
    st.write(f"Toplam bulunan öğün sayısı: **{len(filtered_df)}**")

    if len(filtered_df) > 0:
        avg_cal = filtered_df["calories"].mean()
        avg_protein = filtered_df["protein_g"].mean()
        avg_fiber = filtered_df["fiber_g"].mean()

        st.markdown(
            f"- Ortalama kalori: **{avg_cal:.1f} kcal**  \n"
            f"- Ortalama protein: **{avg_protein:.1f} g**  \n"
            f"- Ortalama lif: **{avg_fiber:.1f} g**"
        )
    else:
        st.warning("Bu filtrelerle eşleşen öğün bulunamadı. Filtreleri gevşetmeyi deneyin.")

    st.subheader("Önerilen Öğünler")

    cols_to_show = [
        "meal_name",
        "cuisine",
        "meal_type",
        "diet_type",
        "calories",
        "protein_g",
        "carbs_g",
        "fat_g",
        "fiber_g",
        "sugar_g",
        "prep_time_min",
        "cook_time_min",
        "is_healthy",
        "rating"
    ]

if len(filtered_df) > 0:
    df_display = filtered_df[cols_to_show].rename(columns=COLUMN_TRANSLATIONS)
    st.dataframe(df_display.reset_index(drop=True))
    

# ================== TAB 2: APRIORI KURALLARI ==================
with tab2:
    st.subheader("Apriori ile Elde Edilen Örüntü Kuralları")

    st.write(
        "Bu bölümde, veri madenciliği sürecinde Apriori algoritması ile elde edilen "
        "birliktelik kurallarının özetini görmektesiniz. Kurallar lift değerine göre "
        "sıralanmıştır."
    )

    # Kullanıcıya basit filtreler
    min_lift = st.slider("Minimum lift değeri", 1.0, float(rules_df["lift"].max()), 1.1, step=0.05)
    top_n = st.slider("Gösterilecek kural sayısı", 5, 30, 10)

    rules_filtered = rules_df[rules_df["lift"] >= min_lift]
    rules_filtered = rules_filtered.sort_values("lift", ascending=False).head(top_n)

    if len(rules_filtered) == 0:
        st.warning("Bu eşiklerle eşleşen kural bulunamadı. Lift değerini düşürmeyi deneyin.")
    else:
        # Kuralı okunabilir forma çevir
        def rule_to_text(row):
            left = ", ".join(list(eval(row["antecedents"])) if isinstance(row["antecedents"], str) and row["antecedents"].startswith("frozenset") else list(row["antecedents"]))
            right = ", ".join(list(eval(row["consequents"])) if isinstance(row["consequents"], str) and row["consequents"].startswith("frozenset") else list(row["consequents"]))
            return f"{left}  →  {right}"

        display_df = rules_filtered[["antecedents", "consequents", "support", "confidence", "lift"]].copy()
        display_df["kural"] = [
            rule_to_text(row) for _, row in rules_filtered.iterrows()
        ]
        display_df = display_df[["kural", "support", "confidence", "lift"]]

        rules_display = display_df.rename(columns={
            "kural": "Kural",
            "support": "Destek",
            "confidence": "Güven",
            "lift": "Lift"
        })

        st.dataframe(rules_display.reset_index(drop=True))

        # Basit bar grafiği (lift değerleri)
        st.markdown("### En Güçlü Kuralların Lift Değerleri")
        fig, ax = plt.subplots(figsize=(8, 4))
        ax.barh(range(len(rules_filtered)), rules_filtered["lift"])
        ax.set_yticks(range(len(rules_filtered)))
        ax.set_yticklabels(display_df["kural"])
        ax.invert_yaxis()
        ax.set_xlabel("Lift")
        fig.tight_layout()
        st.pyplot(fig)

# ================== TAB 3: ÖĞÜN DETAYLARI ==================
with tab3:
    st.subheader("Seçilen Öğünün Besin Profili")

    if len(filtered_df) == 0:
        st.info("Öncelikle 1. sekmedeki filtreleri kullanarak en az bir öğün getirin.")
    else:
        meal_names = filtered_df["meal_name"].tolist()
        selected_meal = st.selectbox("Öğün seçin", meal_names)

        meal_row = filtered_df[filtered_df["meal_name"] == selected_meal].iloc[0]

        st.markdown(f"### {meal_row['meal_name']}")
        st.write(
            f"- Mutfak: **{meal_row['cuisine']}**  \n"
            f"- Öğün türü: **{meal_row['meal_type']}**  \n"
            f"- Diyet türü: **{meal_row['diet_type']}**  \n"
            f"- Pişirme yöntemi: **{meal_row['cooking_method']}**"
        )

        col1, col2, col3 = st.columns(3)
        col1.metric("Kalori (kcal)", f"{meal_row['calories']:.0f}")
        col2.metric("Hazırlık süresi (dk)", f"{meal_row['prep_time_min']}")
        col3.metric("Pişirme süresi (dk)", f"{meal_row['cook_time_min']}")

        # Besin değerleri bar grafiği
        nutrients = meal_row[["protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g"]]
        fig2, ax2 = plt.subplots(figsize=(6, 4))
        ax2.bar(nutrients.index, nutrients.values)
        ax2.set_ylabel("Gram")
        ax2.set_title("Makro Besin Dağılımı")
        fig2.tight_layout()
        st.pyplot(fig2)
