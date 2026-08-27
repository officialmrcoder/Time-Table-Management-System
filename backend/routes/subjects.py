from flask import Blueprint, request, jsonify
from db_config import get_db_connection
import mysql.connector

subjects_bp = Blueprint('subjects', __name__)

@subjects_bp.route('/<int:class_id>', methods=['GET'])
def get_subjects(class_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM subjects WHERE class_id = %s", (class_id,))
    subjects = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(subjects)

@subjects_bp.route('', methods=['POST'])
def create_subject():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO subjects (class_id, name, lectures_per_day)
            VALUES (%s, %s, %s)
        """, (data['class_id'], data['name'], data.get('lectures_per_day', 1)))
        conn.commit()
        return jsonify({"id": cursor.lastrowid, "message": "Subject created"}), 201
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 400
    finally:
        cursor.close()
        conn.close()
        
@subjects_bp.route('/<int:subject_id>', methods=['DELETE'])
def delete_subject(subject_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM subjects WHERE id = %s", (subject_id,))
        conn.commit()
        return jsonify({"message": "Subject deleted"})
    finally:
        cursor.close()
        conn.close()

@subjects_bp.route('/<int:subject_id>', methods=['PUT'])
def update_subject(subject_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE subjects SET name = %s, lectures_per_day = %s WHERE id = %s", 
                       (data['name'], data.get('lectures_per_day', 1), subject_id))
        conn.commit()
        return jsonify({"message": "Subject updated"})
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 400
    finally:
        cursor.close()
        conn.close()
