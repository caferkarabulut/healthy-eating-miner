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
                
                st.write(
                    f"- **{meal['meal_name']}** | Porsiyon: {portion} | "
                    f"{cal:.0f} kcal | 💪 {protein:.1f}g | 🍞 {carbs:.1f}g | 🧈 {fat:.1f}g"
                )

    # --------- GÜNLÜK TOPLAM METRIC CARD'LAR ---------
    st.divider()
    st.markdown("### 📊 Günlük Toplamlar")
    
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("🔥 Kalori", f"{total_cal:.0f} kcal")
    col2.metric("💪 Protein", f"{total_protein:.1f} g")
    col3.metric("🍞 Karbonhidrat", f"{total_carbs:.1f} g")
    col4.metric("🧈 Yağ", f"{total_fat:.1f} g")

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
                col1, col2 = st.columns([3, 1])
                
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
        st.markdown("### 🧠 Otomatik Yorumlar")
        
        yorumlar = []
        
        # Kural 1: Son 3 günde protein düşük mü?
        son_3_gun_protein = df["Protein"].tail(3).mean()
        if son_3_gun_protein < 70:
            yorumlar.append("⚠️ Son 3 günde protein alımın düşük (ort. {:.0f}g < 70g).".format(son_3_gun_protein))
        
        # Kural 2: Kalori dalgalanması yüksek mi?
        kalori_max = df["Kalori"].max()
        kalori_min = df["Kalori"].min()
        kalori_fark = kalori_max - kalori_min
        if kalori_fark > 600:
            yorumlar.append("📉 Günler arası kalori dalgalanması yüksek ({:.0f} kcal fark).".format(kalori_fark))
        
        # Kural 3: Hafta sonu artışı var mı?
        hafta_sonu_cal = []
        hafta_ici_cal = []
        
        for _, row in df.iterrows():
            if row["Gun"].weekday() >= 5:  # Cumartesi=5, Pazar=6
                hafta_sonu_cal.append(row["Kalori"])
            else:
                hafta_ici_cal.append(row["Kalori"])
        
        if hafta_sonu_cal and hafta_ici_cal:
            hs_avg = sum(hafta_sonu_cal) / len(hafta_sonu_cal)
            hi_avg = sum(hafta_ici_cal) / len(hafta_ici_cal)
            
            if hi_avg > 0 and hs_avg > hi_avg * 1.15:
                yorumlar.append("🍕 Hafta sonu kalori artışı gözlemlendi (+{:.0f}%).".format((hs_avg/hi_avg - 1) * 100))
        
        # Kural 4: Dengeli mi?
        if len(yorumlar) == 0:
            yorumlar.append("✅ Beslenme düzenin son hafta genel olarak dengeli.")
        
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
    
    user_message = st.text_input(
        "Ne yemek istiyorsun?",
        placeholder="Örn: 60g protein içeren bir öğün öner..."
    )
    
    if st.button("🚀 Sor"):
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
    email = st.text_input("E-posta", key="login_email")
    password = st.text_input("Şifre", type="password", key="login_password")

    if st.button("Giriş"):
        result = api_login(email, password)
        if result:
            st.session_state.token = result["access_token"]
            st.session_state.user_email = email
            st.rerun()
        else:
            st.error("E-posta veya şifre yanlış")

with tab_register:
    st.subheader("Kayıt Ol")
    email_r = st.text_input("E-posta", key="reg_email")
    password_r = st.text_input("Şifre", type="password", key="reg_password")

    if st.button("Kayıt Ol"):
        r = api_register(email_r, password_r)
        if r.status_code == 200:
            st.success("Kayıt başarılı. Giriş yapabilirsin.")
        elif r.status_code == 400:
            st.warning("Bu e-posta zaten kayıtlı.")
        else:
            st.error("Bir hata oluştu.")
