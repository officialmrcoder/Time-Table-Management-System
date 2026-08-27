# 📅 Time Table Management System

A comprehensive full-stack application designed to automate and manage school/college timetables. It features a smart scheduling algorithm, manual lecture pinning, drag-and-drop adjustments, and clash detection to ensure conflict-free schedules for teachers and students.

**🌐 Live Demo:** [https://bhp2604.vercel.app](https://bhp2604.vercel.app)

---

## ✨ Features

- **🧠 Smart Auto-Generation:** Uses a backtracking algorithm to automatically generate clash-free timetables for all sections.
- **📌 Pin Lectures:** Manually assign specific subjects and teachers to fixed time slots before running the auto-generator.
- **🖱️ Interactive Drag & Drop:** Easily swap lectures or move them to empty slots using an intuitive drag-and-drop interface.
- **🚫 Real-Time Clash Detection:** Prevents assigning a teacher to multiple classes at the exact same time.
- **👨‍🏫 Proxy Assignment:** Quickly assign proxy teachers to specific slots for absent staff.
- **⚙️ Full CRUD Management:** Manage Classes, Sections, Subjects, and Teachers with a clean user interface.

---

## 🛠️ Tech Stack

- **Frontend:** React.js, Vite, Tailwind CSS, Lucide React (Deployed on Vercel)
- **Backend:** Python, Flask, Flask-CORS (Deployed on Render)
- **Database:** MySQL (Hosted on Railway)

---

## 🚀 Local Setup Instructions

### Prerequisites
- Node.js & npm installed
- Python 3.12+ installed
- MySQL Server installed and running

### 1. Database Setup
1. Open MySQL and ensure your server is running.
2. Navigate to the ackend folder and create a .env file with your database credentials:
   `env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=timetable_app_db
   DB_PORT=3306
   `
3. Run the database initialization script to create the schema and tables automatically:
   `ash
   cd backend
   python init_db.py
   `

### 2. Backend Setup
Open a terminal and run the following commands:
`ash
cd backend

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate   # On Mac/Linux use: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the Flask server
python app.py
`
*The backend API will run on http://127.0.0.1:5000*

### 3. Frontend Setup
Open a new terminal and run:
`ash
cd frontend

# Install Node modules
npm install

# Start the Vite development server
npm run dev
`
*The frontend will run on http://localhost:5173*

---

## 📝 License
This project is open-source and available under the MIT License.
