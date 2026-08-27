import os
import sys
import mysql.connector
from db_config import get_db_connection_no_db, get_db_connection

def init_db():
    try:
        conn = get_db_connection_no_db()
        cursor = conn.cursor()
        db_name = os.getenv("DB_NAME", "timetable_app_db")
        cursor.execute(f"DROP DATABASE IF EXISTS {db_name}")
        cursor.execute(f"CREATE DATABASE {db_name}")
        cursor.close()
        conn.close()

        conn = get_db_connection()
        cursor = conn.cursor()

        tables = [
            """CREATE TABLE classes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50) NOT NULL UNIQUE,
                lecture_duration_min INT NOT NULL DEFAULT 35,
                break_duration_min INT NOT NULL DEFAULT 0,
                start_time TIME NOT NULL DEFAULT '08:00:00',
                end_time TIME NOT NULL DEFAULT '13:00:00'
            )""",
            """CREATE TABLE sections (
                id INT AUTO_INCREMENT PRIMARY KEY,
                class_id INT NOT NULL,
                name VARCHAR(50) NOT NULL,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
            )""",
            """CREATE TABLE subjects (
                id INT AUTO_INCREMENT PRIMARY KEY,
                class_id INT NOT NULL,
                name VARCHAR(100) NOT NULL,
                lectures_per_day INT NOT NULL DEFAULT 1,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
            )""",
            """CREATE TABLE teachers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                class_id INT NOT NULL,
                name VARCHAR(100) NOT NULL,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
            )""",
            """CREATE TABLE teacher_subjects (
                id INT AUTO_INCREMENT PRIMARY KEY,
                teacher_id INT NOT NULL,
                subject_id INT NOT NULL,
                FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
            )""",
            """CREATE TABLE timetable_entries (
                id INT AUTO_INCREMENT PRIMARY KEY,
                class_id INT NOT NULL,
                section_id INT NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                subject_id INT NOT NULL,
                teacher_id INT NOT NULL,
                is_proxy BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
                FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
                FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
            )"""
        ]

        for sql in tables:
            cursor.execute(sql)

        conn.commit()
        cursor.close()
        conn.close()
        print(f"[OK] Database '{db_name}' reset with new schema.")
        print("[OK] All tables created successfully.")

    except mysql.connector.Error as err:
        print(f"[ERROR] {err}")
        sys.exit(1)

if __name__ == "__main__":
    init_db()
