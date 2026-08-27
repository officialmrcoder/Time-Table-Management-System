import os
from dotenv import load_dotenv
import mysql.connector

load_dotenv()

DB_CONFIG_NO_DB = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
}

DB_CONFIG = {
    **DB_CONFIG_NO_DB,
    "database": os.getenv("DB_NAME", "timetable_app_db"),
}

def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)

def get_db_connection_no_db():
    return mysql.connector.connect(**DB_CONFIG_NO_DB)
