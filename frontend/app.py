import streamlit as st
import requests

API_BASE = "http://127.0.0.1:8000"

st.set_page_config(page_title="Healthy Eating", page_icon="🥗", layout="centered")

# ------------------ SESSION STATE ------------------
if "token" not in st.session_state:
    st.session_state.token = None

if "user_email" not in st.session_state:
    st.session_state.user_email = None


# ------------------ API HELPERS ------------------
def api_login(email: str, password: str):
    url = f"{API_BASE}/auth/login"
    payload = {"email": email, "password": password}
    r = requests.post(url, json=payload)
    if r.status_code == 200:
        return r.json()
    return None


def api_register(email: str, password: str):
    url = f"{API_BASE}/auth/register"
    payload = {"email": email, "password": password}
    r = requests.post(url, json=payload)
    return r


# ------------------ UI ------------------
st.title("🥗 Healthy Eating")

# --------- LOGOUT ---------
if st.session_state.token:
    st.success(f"Giriş yapıldı: {st.session_state.user_email}")
    if st.button("Çıkış Yap"):
        st.session_state.token = None
        st.session_state.user_email = None
        st.rerun()

    st.divider()
    
    import datetime

    headers = {
        "Authorization": f"Bearer {st.session_state.token}"
    }

    # ------------------ DASHBOARD ------------------
    st.subheader("📊 Günlük Dashboard")

    selected_date = st.date_input(
        "Tarih seç",
        value=datetime.date.today()
    )

    # --------- HEDEFLERİM ---------
    st.divider()
    st.markdown("### 🧭 Hedeflerim")
    
    # Hedefleri çek
    goals_resp = requests.get(
        f"{API_BASE}/user/goals",
        headers=headers
    )
    
    if goals_resp.status_code == 200:
        user_goals = goals_resp.json()
    else:
        user_goals = {"daily_calorie_target": 2000, "daily_protein_target": 100, "goal_type": "koruma"}
    
    goal_labels = {"kilo_verme": "⚖️ Kilo Verme", "kilo_alma": "💪 Kilo Alma", "koruma": "🔄 Koruma"}
    
    col1, col2, col3 = st.columns(3)
    col1.metric("🎯 Kalori Hedefi", f"{user_goals['daily_calorie_target']} kcal")
    col2.metric("💪 Protein Hedefi", f"{user_goals['daily_protein_target']} g")
    col3.metric("Amaç", goal_labels.get(user_goals['goal_type'], user_goals['goal_type']))
    
    # Hedef düzenleme expander
    with st.expander("✏️ Hedeflerimi Düzenle"):
        new_cal = st.number_input("Günlük Kalori Hedefi", min_value=1000, max_value=5000, value=user_goals['daily_calorie_target'])
        new_prot = st.number_input("Günlük Protein Hedefi (g)", min_value=30, max_value=300, value=user_goals['daily_protein_target'])
        new_goal = st.selectbox("Amaç", options=["koruma", "kilo_verme", "kilo_alma"], index=["koruma", "kilo_verme", "kilo_alma"].index(user_goals['goal_type']))
        
        if st.button("💾 Kaydet"):
            save_resp = requests.post(
                f"{API_BASE}/user/goals",
                json={
                    "daily_calorie_target": new_cal,
                    "daily_protein_target": new_prot,
                    "goal_type": new_goal
                },
                headers=headers
            )
            if save_resp.status_code == 200:
                st.success("Hedefler güncellendi!")
                st.rerun()
            else:
                st.error("Hedefler kaydedilemedi.")

    # --------- ÖĞÜN VERİSİNİ ÇEK ---------
    meals_resp = requests.get(
        f"{API_BASE}/meals",
        headers=headers
    )
    meals = meals_resp.json() if meals_resp.status_code == 200 else []
    
    # meal_id -> meal bilgisi map
    meal_dict = {m["meal_id"]: m for m in meals}

    # --------- BUGÜN YEDİKLERİM ---------
    st.markdown("### 🍽️ Bugün Yediklerim")

    logs_resp = requests.get(
        f"{API_BASE}/logs",
        params={"log_date": selected_date},
        headers=headers
    )

    logs = logs_resp.json() if logs_resp.status_code == 200 else []

    if len(logs) == 0:
        st.info("Bu gün için kayıt yok.")
        total_cal = 0
        total_protein = 0
        total_carbs = 0
        total_fat = 0
    else:
        total_cal = 0
        total_protein = 0
        total_carbs = 0
        total_fat = 0

        for log in logs:
            meal = meal_dict.get(log["meal_id"])
            if meal:
                portion = log["portion"]
                cal = meal["calories"] * portion
                protein = meal["protein_g"] * portion
                carbs = meal["carbs_g"] * portion
                fat = meal["fat_g"] * portion
                
                total_cal += cal
                total_protein += protein
                total_carbs += carbs
                total_fat += fat
                
                col1, col2 = st.columns([5, 1])
                with col1:
                    st.write(
                        f"- **{meal['meal_name']}** | Porsiyon: {portion} | "
                        f"{cal:.0f} kcal | 💪 {protein:.1f}g | 🍞 {carbs:.1f}g | 🧈 {fat:.1f}g"
                    )
                with col2:
                    if st.button("🗑️", key=f"del_log_{log['id']}"):
                        requests.delete(
                            f"{API_BASE}/logs/{log['id']}",
                            headers=headers
                        )
                        st.rerun()

    # --------- GÜNLÜK TOPLAM METRIC CARD'LAR ---------
    st.divider()
    st.markdown("### 📊 Günlük Toplamlar")
    
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("🔥 Kalori", f"{total_cal:.0f} kcal")
    col2.metric("💪 Protein", f"{total_protein:.1f} g")
    col3.metric("🍞 Karbonhidrat", f"{total_carbs:.1f} g")
    col4.metric("🧈 Yağ", f"{total_fat:.1f} g")

    # --------- AI ETKİSİ ---------
    st.divider()
    st.markdown("### 🧠 AI Etkisi")
    
    # AI istatistiklerini çek
    ai_stats_resp = requests.get(
        f"{API_BASE}/ai/stats",
        headers=headers
    )
    
    if ai_stats_resp.status_code == 200:
        ai_stats = ai_stats_resp.json()
        
        col1, col2 = st.columns(2)
        col1.metric(
            "📊 Öneri Kabul Oranı",
            f"%{int(ai_stats['acceptance_rate'] * 100)}"
        )
        col2.metric(
            "💬 Toplam AI Etkileşimi",
            f"{ai_stats['total_interactions']}"
        )
        
        # En çok kabul edilen öğünler
        top_meals_resp = requests.get(
            f"{API_BASE}/ai/top-meals",
            headers=headers
        )
        
        if top_meals_resp.status_code == 200:
            top_meals_data = top_meals_resp.json()
            if top_meals_data:
                st.markdown("**🏆 AI'nin En Çok Kabul Edilen Önerileri:**")
                for tm in top_meals_data[:3]:
                    st.write(f"• {tm['meal_name']} ({tm['count']} kez)")
    else:
        st.info("Henüz AI etkileşimi yok.")

    # --------- ÖĞÜN EKLE ---------
    st.divider()
    st.markdown("### ➕ Öğün Ekle")

    if len(meals) == 0:
        st.warning("Öğün listesi yüklenemedi.")
    else:
        meal_map = {f"{m['meal_name']} ({m['calories']} kcal)": m["meal_id"] for m in meals}

        selected_meal = st.selectbox(
            "Öğün seç",
            options=list(meal_map.keys())
        )

        portion = st.number_input("Porsiyon", min_value=0.1, value=1.0, step=0.1)

        # --------- SEÇİLEN ÖĞÜN DETAYI ---------
        selected_meal_id = meal_map[selected_meal]
        selected_meal_data = meal_dict.get(selected_meal_id)
        
        if selected_meal_data:
            p_cal = selected_meal_data["calories"] * portion
            p_protein = selected_meal_data["protein_g"] * portion
            p_carbs = selected_meal_data["carbs_g"] * portion
            p_fat = selected_meal_data["fat_g"] * portion
            
            st.markdown("#### 📋 Seçilen Öğün Detayı")
            st.caption(f"Porsiyon: {portion} için hesaplanmış değerler")
            
            # Progress bars
            max_val = max(p_protein, p_carbs, p_fat, 1)  # 0'a bölünmeyi önle
            
            col1, col2 = st.columns([1, 3])
            col1.write("💪 Protein")
            col2.progress(min(p_protein / 100, 1.0), text=f"{p_protein:.1f}g")
            
            col1, col2 = st.columns([1, 3])
            col1.write("🍞 Karbonhidrat")
            col2.progress(min(p_carbs / 150, 1.0), text=f"{p_carbs:.1f}g")
            
            col1, col2 = st.columns([1, 3])
            col1.write("🧈 Yağ")
            col2.progress(min(p_fat / 80, 1.0), text=f"{p_fat:.1f}g")
            
            st.metric("🔥 Toplam Kalori", f"{p_cal:.0f} kcal")

        # Butonları yan yana koy
        btn_col1, btn_col2 = st.columns(2)
        
        with btn_col1:
            if st.button("🍽️ Bugün Yedim"):
                meal_id = meal_map[selected_meal]
                r = requests.post(
                    f"{API_BASE}/logs",
                    params={
                        "meal_id": meal_id,
                        "portion": portion,
                        "log_date": selected_date
                    },
                    headers=headers
                )

                if r.status_code == 200:
                    st.success("Öğün eklendi.")
                    st.rerun()
                else:
                    st.error("Öğün eklenirken hata oluştu.")
        
        with btn_col2:
            if st.button("⭐ Favoriye Ekle"):
                meal_id = meal_map[selected_meal]
                r = requests.post(
                    f"{API_BASE}/favorites",
                    params={"meal_id": meal_id},
                    headers=headers
                )
                
                if r.status_code == 200:
                    st.success("Favorilere eklendi!")
                    st.rerun()
                else:
                    st.warning("Bu öğün zaten favorilerde olabilir.")

    # --------- FAVORİLERİM ---------
    st.divider()
    st.markdown("### ⭐ Favorilerim")
    
    favs_resp = requests.get(
        f"{API_BASE}/favorites",
        headers=headers
    )
    
    favorites = favs_resp.json() if favs_resp.status_code == 200 else []
    
    if len(favorites) == 0:
        st.info("Henüz favori öğün eklemediniz.")
    else:
        for i, fav in enumerate(favorites):
            fav_meal = meal_dict.get(fav["meal_id"])
            if fav_meal:
                col1, col2, col3 = st.columns([3, 1, 1])
                
                with col1:
                    st.write(
                        f"**{fav_meal['meal_name']}** | "
                        f"{fav_meal['calories']} kcal | "
                        f"💪 {fav_meal['protein_g']}g"
                    )
                
                with col2:
                    if st.button("🔁 Yedim", key=f"fav_eat_{i}"):
                        r = requests.post(
                            f"{API_BASE}/logs",
                            params={
                                "meal_id": fav["meal_id"],
                                "portion": 1.0,
                                "log_date": selected_date
                            },
                            headers=headers
                        )
                        
                        if r.status_code == 200:
                            st.success(f"{fav_meal['meal_name']} eklendi!")
                            st.rerun()
                        else:
                            st.error("Eklenirken hata oluştu.")
                
                with col3:
                    if st.button("🗑️", key=f"del_fav_{i}"):
                        requests.delete(
                            f"{API_BASE}/favorites/{fav['meal_id']}",
                            headers=headers
                        )
                        st.rerun()

    # --------- HAFTALIK ÖZET ---------
    st.divider()
    st.markdown("### 📅 Haftalık Özet")
    
    # Son 7 günün verilerini topla
    import datetime
    from datetime import timedelta
    
    weekly_data = []
    
    for i in range(6, -1, -1):  # 6 gün önce -> bugün
        day = selected_date - timedelta(days=i)
        
        # O günün loglarını çek
        day_logs_resp = requests.get(
            f"{API_BASE}/logs",
            params={"log_date": day},
            headers=headers
        )
        
        day_logs = day_logs_resp.json() if day_logs_resp.status_code == 200 else []
        
        # Günlük toplam kalori ve protein hesapla
        day_cal = 0
        day_protein = 0
        for log in day_logs:
            meal = meal_dict.get(log["meal_id"])
            if meal:
                portion = log["portion"]
                day_cal += meal["calories"] * portion
                day_protein += meal["protein_g"] * portion
        
        weekly_data.append({
            "Tarih": day.strftime("%d/%m"),
            "Gun": day,
            "Kalori": day_cal,
            "Protein": day_protein
        })
    
    # Grafik çiz
    import pandas as pd
    
    df = pd.DataFrame(weekly_data)
    
    if df["Kalori"].sum() > 0:
        st.line_chart(df.set_index("Tarih")["Kalori"])
        
        # Haftalık ortalama
        avg_cal = df["Kalori"].mean()
        max_day = df.loc[df["Kalori"].idxmax()]
        
        col1, col2 = st.columns(2)
        col1.metric("📊 Haftalık Ortalama", f"{avg_cal:.0f} kcal")
        col2.metric("📈 En Yüksek Gün", f"{max_day['Tarih']}: {max_day['Kalori']:.0f} kcal")
        
        # --------- OTOMATİK YORUMLAR ---------
        st.divider()
        st.markdown("### 🧠 Akıllı Yorumlar")
        
        yorumlar = []
        
        # Hedef bazlı yorumlar
        cal_target = user_goals['daily_calorie_target']
        prot_target = user_goals['daily_protein_target']
        
        # Bugünün kalori/protein yüzdesi
        today_cal_pct = (total_cal / cal_target * 100) if cal_target > 0 else 0
        today_prot_pct = (total_protein / prot_target * 100) if prot_target > 0 else 0
        
        # Kural 1: Günlük protein hedefi
        if total_protein > 0:
            if today_prot_pct < 50:
                yorumlar.append(f"⚠️ Protein hedefinin %{today_prot_pct:.0f}'indesin ({total_protein:.0f}g / {prot_target}g). Akşam için yüksek proteinli öğün önerilir.")
            elif today_prot_pct >= 100:
                yorumlar.append(f"💪 Protein hedefini tutturdun! (%{today_prot_pct:.0f})")
        
        # Kural 2: Günlük kalori hedefi
        if total_cal > 0:
            if today_cal_pct > 120:
                yorumlar.append(f"🔥 Kalori hedefini aştın (%{today_cal_pct:.0f}). Yarın daha hafif öğünler deneyebilirsin.")
            elif today_cal_pct >= 90 and today_cal_pct <= 110:
                yorumlar.append(f"✅ Kalori hedefine ulaştın (%{today_cal_pct:.0f}). Harika gidiyorsun!")
        
        # Kural 3: Son 3 günde protein düşük mü?
        son_3_gun_protein = df["Protein"].tail(3).mean()
        protein_pct_avg = (son_3_gun_protein / prot_target * 100) if prot_target > 0 else 0
        if protein_pct_avg < 70:
            yorumlar.append(f"📉 Son 3 günde protein alımın hedefin %{protein_pct_avg:.0f}'i (ort. {son_3_gun_protein:.0f}g).")
        
        # Kural 4: Haftalık kalori ortalaması vs hedef
        if avg_cal > 0:
            weekly_cal_pct = (avg_cal / cal_target * 100) if cal_target > 0 else 0
            if user_goals['goal_type'] == 'kilo_verme' and weekly_cal_pct > 100:
                yorumlar.append(f"⚖️ Kilo vermek istiyorsun ama haftalık ortalaması hedefin üzerinde (%{weekly_cal_pct:.0f}).")
            elif user_goals['goal_type'] == 'kilo_alma' and weekly_cal_pct < 100:
                yorumlar.append(f"💪 Kilo almak istiyorsun ama haftalık ortalaman hedefin altında (%{weekly_cal_pct:.0f}).")
        
        # Kural 5: Dengeli mi?
        if len(yorumlar) == 0:
            yorumlar.append("✅ Hedeflerine uygun ilerliyorsun. Devam et!")
        
        # Yorumları göster
        for yorum in yorumlar:
            st.write(f"• {yorum}")
    else:
        st.info("Bu hafta için veri yok.")

    # --------- AI CHATBOT ---------
    st.divider()
    st.markdown("### 🤖 Beslenme Asistanı")
    
    # AI yanıtını session_state'de sakla
    if "ai_response" not in st.session_state:
        st.session_state.ai_response = None
    
    with st.form("ai_chat_form"):
        user_message = st.text_input(
            "Ne yemek istiyorsun?",
            placeholder="Örn: 60g protein içeren bir öğün öner..."
        )
        submitted = st.form_submit_button("🚀 Sor")
        
        if submitted:
            if user_message.strip():
                with st.spinner("AI düşünüyor..."):
                    # Haftalık verileri hazırla
                    weekly_cal = [d["Kalori"] for d in weekly_data]
                    weekly_prot = [d["Protein"] for d in weekly_data]
                    
                    # Favorileri al
                    fav_names = []
                    for fav in favorites:
                        fav_meal = meal_dict.get(fav["meal_id"])
                        if fav_meal:
                            fav_names.append(fav_meal["meal_name"])
                    
                    # AI endpoint'e gönder
                    ai_resp = requests.post(
                        f"{API_BASE}/ai/chat",
                        json={
                            "user_message": user_message,
                            "weekly_calories": weekly_cal,
                            "weekly_protein": weekly_prot,
                            "favorites": fav_names
                        },
                        headers=headers
                    )
                    
                    if ai_resp.status_code == 200:
                        st.session_state.ai_response = ai_resp.json()
                    else:
                        st.session_state.ai_response = {"error": "AI servisi şu anda kullanılamıyor."}
            else:
                st.warning("Lütfen bir soru yazın.")
    
    # AI yanıtını göster (session_state'den)
    if st.session_state.ai_response:
        ai_data = st.session_state.ai_response
        
        if "error" in ai_data:
            st.error(ai_data["error"])
        else:
            st.markdown("#### 💬 Yanıt")
            st.write(ai_data["reply"])
            
            # Önerilen öğünler
            if ai_data.get("suggested_meals"):
                st.markdown("#### 🍽️ Önerilen Öğünler")
                
                interaction_id = ai_data.get("interaction_id")
                
                for i, meal_name in enumerate(ai_data["suggested_meals"]):
                    # Öğün bilgisini bul
                    suggested_meal = None
                    for m in meals:
                        if m["meal_name"] == meal_name:
                            suggested_meal = m
                            break
                    
                    if suggested_meal:
                        col1, col2, col3 = st.columns([3, 1, 1])
                        
                        with col1:
                            st.write(f"**{meal_name}** ({suggested_meal['calories']} kcal)")
                        
                        with col2:
                            if st.button("⭐", key=f"ai_fav_{i}"):
                                requests.post(
                                    f"{API_BASE}/favorites",
                                    params={"meal_id": suggested_meal["meal_id"]},
                                    headers=headers
                                )
                                # AI kabul bildirimi
                                if interaction_id:
                                    requests.post(
                                        f"{API_BASE}/ai/accept",
                                        json={
                                            "ai_interaction_id": interaction_id,
                                            "meal_id": suggested_meal["meal_id"]
                                        },
                                        headers=headers
                                    )
                                st.success("Favoriye eklendi!")
                        
                        with col3:
                            if st.button("🍽️", key=f"ai_eat_{i}"):
                                requests.post(
                                    f"{API_BASE}/logs",
                                    params={
                                        "meal_id": suggested_meal["meal_id"],
                                        "portion": 1.0,
                                        "log_date": selected_date
                                    },
                                    headers=headers
                                )
                                # AI kabul bildirimi
                                if interaction_id:
                                    requests.post(
                                        f"{API_BASE}/ai/accept",
                                        json={
                                            "ai_interaction_id": interaction_id,
                                            "meal_id": suggested_meal["meal_id"]
                                        },
                                        headers=headers
                                    )
                                st.success(f"{meal_name} eklendi!")

    st.stop()


# --------- LOGIN / REGISTER ---------
tab_login, tab_register = st.tabs(["Giriş Yap", "Kayıt Ol"])

with tab_login:
    st.subheader("Giriş Yap")
    with st.form("login_form"):
        email = st.text_input("E-posta")
        password = st.text_input("Şifre", type="password")
        submitted = st.form_submit_button("Giriş")
        
        if submitted:
            result = api_login(email, password)
            if result:
                st.session_state.token = result["access_token"]
                st.session_state.user_email = email
                st.rerun()
            else:
                st.error("E-posta veya şifre yanlış")

with tab_register:
    st.subheader("Kayıt Ol")
    with st.form("register_form"):
        email_r = st.text_input("E-posta")
        password_r = st.text_input("Şifre", type="password")
        submitted_r = st.form_submit_button("Kayıt Ol")
        
        if submitted_r:
            r = api_register(email_r, password_r)
            if r.status_code == 200:
                st.success("Kayıt başarılı. Giriş yapabilirsin.")
            elif r.status_code == 400:
                st.warning("Bu e-posta zaten kayıtlı.")
            else:
                st.error("Bir hata oluştu.")
