from flask import Blueprint, request, jsonify
from db_config import get_db_connection
import mysql.connector

teachers_bp = Blueprint('teachers', __name__)

@teachers_bp.route('/<int:class_id>', methods=['GET'])
def get_teachers(class_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM teachers WHERE class_id = %s", (class_id,))
    teachers = cursor.fetchall()
    
    for t in teachers:
        cursor.execute("""
            SELECT s.id, s.name 
            FROM subjects s
            JOIN teacher_subjects ts ON s.id = ts.subject_id
            WHERE ts.teacher_id = %s
        """, (t['id'],))
        t['subjects'] = cursor.fetchall()
        
    cursor.close()
    conn.close()
    return jsonify(teachers)

@teachers_bp.route('', methods=['POST'])
def create_teacher():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO teachers (class_id, name) VALUES (%s, %s)", (data['class_id'], data['name']))
        teacher_id = cursor.lastrowid
        
        for subject_id in data.get('subjects', []):
            cursor.execute("INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES (%s, %s)", (teacher_id, subject_id))
            
        conn.commit()
        return jsonify({"id": teacher_id, "message": "Teacher created"}), 201
    except mysql.connector.Error as err:
        conn.rollback()
        return jsonify({"error": str(err)}), 400
    finally:
        cursor.close()
        conn.close()
        
@teachers_bp.route('/<int:teacher_id>', methods=['DELETE'])
def delete_teacher(teacher_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM teachers WHERE id = %s", (teacher_id,))
        conn.commit()
        return jsonify({"message": "Teacher deleted"})
    finally:
        cursor.close()
        conn.close()

@teachers_bp.route('/<int:teacher_id>', methods=['PUT'])
def update_teacher(teacher_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE teachers SET name = %s WHERE id = %s", (data['name'], teacher_id))
        
        # update subjects
        cursor.execute("DELETE FROM teacher_subjects WHERE teacher_id = %s", (teacher_id,))
        for subject_id in data.get('subjects', []):
            cursor.execute("INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES (%s, %s)", (teacher_id, subject_id))
            
        conn.commit()
        return jsonify({"message": "Teacher updated"})
    except mysql.connector.Error as err:
        conn.rollback()
        return jsonify({"error": str(err)}), 400
    finally:
        cursor.close()
        conn.close()
