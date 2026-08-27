# Academy Timetable Management System (PWA)

A Progressive Web App for generating clash-free weekly timetables for an academy.

## Tech Stack
- Frontend: React (Vite), Tailwind CSS, @dnd-kit/core
- Backend: Python, Flask, MySQL

## Setup Instructions

### 1. Database Setup
1. Ensure MySQL Server is running locally.
2. The default credentials expected in `backend/.env` are:
   - Host: localhost
   - User: root
   - Password: root
   - DB Name: timetable_app_db
   (Modify `backend/.env` if your MySQL credentials differ).

### 2. Backend Setup
Open a terminal and run:
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate   # On Windows
pip install -r requirements.txt
python init_db.py         # Creates database and tables
python app.py             # Starts the Flask API on http://127.0.0.1:5000
```

### 3. Frontend Setup
Open a separate terminal and run:
```bash
cd frontend
npm install
npm run dev
```

The app will be available at http://localhost:5173.
