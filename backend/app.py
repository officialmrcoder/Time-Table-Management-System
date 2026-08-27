from flask import Flask, jsonify
from flask_cors import CORS
from routes.classes import classes_bp
from routes.sections import sections_bp
from routes.subjects import subjects_bp
from routes.teachers import teachers_bp
from routes.timetable import timetable_bp
from db_config import get_db_connection
import mysql.connector
import os

app = Flask(__name__)
CORS(app)

app.register_blueprint(classes_bp, url_prefix='/api/classes')
app.register_blueprint(sections_bp, url_prefix='/api/sections')
app.register_blueprint(subjects_bp, url_prefix='/api/subjects')
app.register_blueprint(teachers_bp, url_prefix='/api/teachers')
app.register_blueprint(timetable_bp, url_prefix='/api')

@app.errorhandler(Exception)
def handle_exception(e):
    return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
