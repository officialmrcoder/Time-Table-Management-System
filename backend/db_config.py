import os
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import pooling

load_dotenv()

DB_CONFIG_NO_DB = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "port": int(os.getenv("DB_PORT", 3306)),
}

DB_CONFIG = {
    **DB_CONFIG_NO_DB,
    "database": os.getenv("DB_NAME", "timetable_app_db"),
}

# Create a connection pool to keep connections open and ready
try:
    db_pool = pooling.MySQLConnectionPool(
        pool_name="timetable_pool",
        pool_size=5,
        pool_reset_session=True,
        **DB_CONFIG
    )
except Exception as e:
    print(f"Error creating connection pool: {e}")
    db_pool = None

def get_db_connection():
    # Fetch a ready connection from the pool (Extremely fast)
    if db_pool:
        return db_pool.get_connection()
    # Fallback if pool fails
    return mysql.connector.connect(**DB_CONFIG)

def get_db_connection_no_db():
    return mysql.connector.connect(**DB_CONFIG_NO_DB)
