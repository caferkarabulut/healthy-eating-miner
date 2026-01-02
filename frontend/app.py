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
    st.subheader("🎉 Giriş başarılı")
    st.write("Bir sonraki adımda dashboard ve öğün ekleme ekranlarını yapacağız.")
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
