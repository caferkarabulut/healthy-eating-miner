# Healthy Eating App - Deployment Guide

## 🚀 Backend Deploy (Render.com)

### Option 1: Using render.yaml (Recommended)
1. Repository'yi Render.com'a bağla
2. "New Web Service" → "From a Blueprint" seç
3. `render.yaml` otomatik algılanacak

### Option 2: Manual Setup
1. Render Dashboard → New Web Service
2. Docker runtime seç
3. Root Directory: `backend`
4. Dockerfile Path: `./Dockerfile`

### Environment Variables (Render Dashboard'da ayarla)
```
DB_SERVER=your-server.database.windows.net
DB_NAME=healthy_eating_db
DB_USER=your_username
DB_PASSWORD=your_password
JWT_SECRET=(auto-generated veya manual)
OPENAI_API_KEY=sk-...
CORS_ORIGINS=https://your-app.vercel.app
ENV=production
DEBUG=false
```

---

## 🌐 Frontend Deploy (Vercel)

### Steps
1. Vercel Dashboard → Import Git Repository
2. Framework: Next.js (auto-detected)
3. Root Directory: `web`

### Environment Variables (Vercel Dashboard'da ayarla)
```
NEXT_PUBLIC_API_URL=https://your-render-app.onrender.com
```

---

## 🔗 Deploy Sonrası Yapılacaklar

1. **Render Backend URL'i Al**
   - Deploy tamamlandıktan sonra: `https://healthy-eating-api.onrender.com`

2. **Vercel'de API URL Güncelle**
   - Settings → Environment Variables
   - `NEXT_PUBLIC_API_URL` = Render URL

3. **Render'da CORS Güncelle**
   - Settings → Environment
   - `CORS_ORIGINS` = Vercel URL

4. **Health Check Kontrol**
   - `https://your-backend.onrender.com/health`

---

## 📝 Deployment Checklist

- [ ] Azure SQL / Cloud MSSQL credentials hazır
- [ ] OpenAI API key aktif
- [ ] Render deploy başarılı
- [ ] Vercel deploy başarılı
- [ ] CORS_ORIGINS güncellendi
- [ ] NEXT_PUBLIC_API_URL güncellendi
- [ ] Health check çalışıyor
- [ ] Login/Register test edildi
