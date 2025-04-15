# Healthy Eating Miner

A nutrition tracking platform that combines meal logging, metabolic calculations, and AI-powered coaching to help users manage their diet effectively.

## Overview

This project consists of a **FastAPI backend** connected to **Azure SQL** and a **Next.js frontend**. Users can log meals, track macros, set goals, and get personalized feedback from an AI nutrition coach powered by GPT-4o.

The app also includes:
- Rule-based daily warnings (calorie overages, low protein, inactivity)
- Streak tracking to encourage consistent logging
- Weekly performance summaries with trend analysis
- AI suggestion acceptance tracking to measure coaching effectiveness

## Architecture

```
├── backend/          # FastAPI + SQLAlchemy + Azure SQL
│   ├── app/
│   │   ├── core/     # Config, security, rate limiting
│   │   ├── db/       # Models, session, migrations
│   │   ├── routers/  # API endpoints
│   │   └── services/ # Business logic (metabolism, warnings, AI context)
│   ├── Dockerfile
│   └── requirements.txt
├── web/              # Next.js frontend
├── data/             # Source CSV datasets
├── results/          # Apriori association rules
└── notebooks/        # Exploratory data analysis
```

## Tech Stack

| Layer     | Technology              |
|-----------|------------------------|
| Backend   | Python 3.11, FastAPI    |
| Database  | Azure SQL (via pyodbc)  |
| Auth      | JWT + bcrypt            |
| AI        | OpenAI GPT-4o-mini      |
| Frontend  | Next.js, React          |
| Deploy    | Docker, Azure           |

## Getting Started

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate       # Windows
pip install -r requirements.txt
cp .env.example .env         # Edit with your credentials
uvicorn app.main:app --reload
```

### Frontend

```bash
cd web
npm install
npm run dev
```

### Environment Variables

Copy `backend/.env.example` and fill in your Azure SQL credentials, JWT secret, and OpenAI API key.

## Data Pipeline

The original meal dataset (`data/healthy_eating.csv`) was cleaned and analyzed using association rule mining (Apriori). Results are in `results/apriori_rules.csv`. The exploratory analysis notebook is at `notebooks/01_eda.ipynb`.

## API Endpoints

| Endpoint               | Method | Description                        |
|------------------------|--------|------------------------------------|
| `/auth/register`       | POST   | Register a new user                |
| `/auth/login`          | POST   | Login and get JWT token            |
| `/meals`               | GET    | List/search meals                  |
| `/logs`                | POST   | Log a meal                         |
| `/progress/daily`      | GET    | Daily calorie/protein progress     |
| `/ai/chat`             | POST   | AI nutrition coach chat            |
| `/ai/weekly-coach`     | GET    | Weekly AI coaching summary         |
| `/analysis/warnings`   | GET    | Rule-based daily warnings          |
| `/engagement/streak`   | GET    | Streak status                      |
| `/profile`             | GET/POST | User profile (height, weight)    |
| `/profile/activity`    | GET/POST | Daily step count and metabolics  |

## License

MIT
