# Petrol Pump Employee Management and Alert System

A digital employee management and alert system for **H.M. Traders Indian Oil**.
Handles employee records, attendance, salary calculation, borrowed-petrol
tracking, and automated deadline alerts.

## Tech Stack

| Layer     | Technology                  |
| --------- | --------------------------- |
| Frontend  | React.js + Vite             |
| Mobile    | React Native + Expo         |
| Backend   | Node.js + Express           |
| Database  | MySQL                       |
| Hosting   | AWS (planned) / Localhost   |

## Project Structure

```
Petrol_Pump/
├── backend/        # Node.js + Express REST API
├── frontend/       # React + Vite web dashboard
├── mobile/         # React Native (Expo) mobile app
├── database/       # MySQL schema and seed files
└── README.md
```

## User Roles

- **Admin** — full control over the system
- **Owner** — view all reports, monitor borrowed petrol, receive alerts
- **Manager** — manage employees, mark attendance, calculate salary
- **Employee** — view own attendance, salary, and profile

## Getting Started

Setup instructions for each component are in their respective folders:

- `database/README.md` — MySQL schema setup
- `backend/README.md` — backend API setup
- `frontend/README.md` — web dashboard setup
- `mobile/README.md` — mobile app setup

## Branching Strategy

- `main` — stable production-ready code
- `develop` — integration branch
- `feature/auth`, `feature/dashboard`, `feature/attendance`, `feature/alerts` — feature branches

## License

Proprietary — H.M. Traders Indian Oil.
