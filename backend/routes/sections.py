from flask import Blueprint, request, jsonify
from db_config import get_db_connection
import mysql.connector

sections_bp = Blueprint('sections', __name__)

@sections_bp.route('/<int:class_id>', methods=['GET'])
def get_sections(class_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM sections WHERE class_id = %s", (class_id,))
    sections = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(sections)

@sections_bp.route('', methods=['POST'])
def create_section():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO sections (class_id, name) VALUES (%s, %s)", (data['class_id'], data['name']))
        conn.commit()
        return jsonify({"id": cursor.lastrowid, "message": "Section created"}), 201
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 400
    finally:
        cursor.close()
        conn.close()

@sections_bp.route('/<int:section_id>', methods=['DELETE'])
def delete_section(section_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM sections WHERE id = %s", (section_id,))
        conn.commit()
        return jsonify({"message": "Section deleted"})
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 400
    finally:
        cursor.close()
        conn.close()

@sections_bp.route('/<int:section_id>', methods=['PUT'])
def update_section(section_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE sections SET name = %s WHERE id = %s", (data['name'], section_id))
        conn.commit()
        return jsonify({"message": "Section updated"})
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 400
    finally:
        cursor.close()
        conn.close()
