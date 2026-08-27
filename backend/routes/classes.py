from flask import Blueprint, request, jsonify
from db_config import get_db_connection
import mysql.connector

classes_bp = Blueprint('classes', __name__)

@classes_bp.route('', methods=['GET'])
def get_classes():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM classes")
    classes = cursor.fetchall()
    for c in classes:
        c['start_time'] = str(c['start_time'])
        c['end_time'] = str(c['end_time'])
    cursor.close()
    conn.close()
    return jsonify(classes)

@classes_bp.route('', methods=['POST'])
def create_class():
    data = request.json
    if not data or not data.get('name'):
        return jsonify({"error": "Class name is required"}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO classes (name, lecture_duration_min, break_duration_min, start_time, end_time) 
            VALUES (%s, %s, %s, %s, %s)
        """, (
            data['name'],
            data.get('lecture_duration_min', 35),
            data.get('break_duration_min', 15),
            data.get('start_time', '08:00:00'),
            data.get('end_time', '13:00:00')
        ))
        conn.commit()
        return jsonify({"id": cursor.lastrowid, "message": "Class created"}), 201
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 400
    finally:
        cursor.close()
        conn.close()

@classes_bp.route('/<int:class_id>', methods=['PUT'])
def update_class(class_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE classes 
            SET name = %s, lecture_duration_min = %s, break_duration_min = %s, 
                start_time = %s, end_time = %s
            WHERE id = %s
        """, (
            data['name'],
            data['lecture_duration_min'],
            data.get('break_duration_min', 0),
            data['start_time'],
            data['end_time'],
            class_id
        ))
        conn.commit()
        return jsonify({"message": "Class updated successfully"}), 200
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 400
    finally:
        cursor.close()
        conn.close()

@classes_bp.route('/<int:class_id>', methods=['DELETE'])
def delete_class(class_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM classes WHERE id = %s", (class_id,))
        conn.commit()
        return jsonify({"message": "Class deleted successfully"}), 200
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 400
    finally:
        cursor.close()
        conn.close()
