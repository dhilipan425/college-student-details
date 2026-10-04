from flask import Flask, request, jsonify, send_from_directory, session
import sqlite3
import os

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests


app = Flask(__name__)

# -------------------------------------------------
# CONFIGURATION
# -------------------------------------------------

GOOGLE_CLIENT_ID = "1031418799659-049fh5b6cgvds9v4f6h5eek8gh4kctdq.apps.googleusercontent.com"

app.secret_key = os.environ.get(
    "SECRET_KEY",
    "change-this-secret-key-before-production"
)

DATABASE = "students.db"


# -------------------------------------------------
# DATABASE
# -------------------------------------------------

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def create_database():
    conn = get_db()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            student_number TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL,
            phone TEXT,
            department TEXT,
            year TEXT,
            blood_group TEXT
        )
    """)

    # Add blood_group to older databases
    columns = conn.execute("PRAGMA table_info(students)").fetchall()

    column_names = [column["name"] for column in columns]

    if "blood_group" not in column_names:
        conn.execute(
            "ALTER TABLE students ADD COLUMN blood_group TEXT"
        )

    conn.commit()
    conn.close()


# -------------------------------------------------
# GOOGLE LOGIN
# -------------------------------------------------

@app.route("/auth/google", methods=["POST"])
def google_login():

    data = request.get_json()

    if not data or "credential" not in data:
        return jsonify({
            "success": False,
            "message": "Google credential is missing"
        }), 400

    credential = data["credential"]

    try:
        # Verify the Google ID token on the SERVER
        idinfo = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )

        # Make sure the token belongs to Google
        if idinfo.get("iss") not in [
            "accounts.google.com",
            "https://accounts.google.com"
        ]:
            return jsonify({
                "success": False,
                "message": "Invalid Google issuer"
            }), 401

        # Get verified information
        user = {
            "name": idinfo.get("name"),
            "email": idinfo.get("email"),
            "picture": idinfo.get("picture")
        }

        # Store user information in Flask session
        session["user"] = user

        return jsonify({
            "success": True,
            "user": user
        })

    except ValueError:
        return jsonify({
            "success": False,
            "message": "Invalid or expired Google token"
        }), 401

    except Exception as e:
        print("Google login error:", e)

        return jsonify({
            "success": False,
            "message": "Google authentication failed"
        }), 500


# -------------------------------------------------
# CURRENT LOGGED-IN USER
# -------------------------------------------------

@app.route("/auth/me", methods=["GET"])
def get_current_user():

    user = session.get("user")

    if not user:
        return jsonify({
            "loggedIn": False
        })

    return jsonify({
        "loggedIn": True,
        "user": user
    })


# -------------------------------------------------
# LOGOUT
# -------------------------------------------------

@app.route("/auth/logout", methods=["POST"])
def logout():

    session.clear()

    return jsonify({
        "success": True
    })


# -------------------------------------------------
# MAIN PAGE
# -------------------------------------------------

@app.route("/")
def home():
    return send_from_directory(".", "index.html")


# -------------------------------------------------
# STATIC FILES
# -------------------------------------------------

@app.route("/<path:filename>")
def serve_file(filename):
    return send_from_directory(".", filename)


# -------------------------------------------------
# ADD STUDENT
# -------------------------------------------------

@app.route("/add_student", methods=["POST"])
def add_student():

    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "No data received"
        }), 400

    name = data.get("name", "").strip()
    student_number = data.get("studentNumber", "").strip()
    email = data.get("email", "").strip()
    phone = data.get("phone", "").strip()
    department = data.get("department", "").strip()
    year = data.get("year", "").strip()
    blood_group = data.get("bloodGroup", "").strip()

    # Required fields
    if not name or not student_number or not email:
        return jsonify({
            "success": False,
            "message": "Name, student number and email are required"
        }), 400

    try:

        conn = get_db()

        conn.execute("""
            INSERT INTO students
            (
                name,
                student_number,
                email,
                phone,
                department,
                year,
                blood_group
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            name,
            student_number,
            email,
            phone,
            department,
            year,
            blood_group
        ))

        conn.commit()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Student added successfully"
        })

    except sqlite3.IntegrityError:

        return jsonify({
            "success": False,
            "message": "Student number already exists"
        }), 409

    except Exception as e:

        print("Database error:", e)

        return jsonify({
            "success": False,
            "message": "Could not add student"
        }), 500


# -------------------------------------------------
# GET ALL STUDENTS
# -------------------------------------------------

@app.route("/students", methods=["GET"])
def get_students():

    try:

        conn = get_db()

        students = conn.execute("""
            SELECT
                id,
                name,
                student_number,
                email,
                phone,
                department,
                year,
                blood_group
            FROM students
            ORDER BY name ASC
        """).fetchall()

        conn.close()

        student_list = []

        for student in students:

            student_list.append({
                "id": student["id"],
                "name": student["name"],
                "student_number": student["student_number"],
                "email": student["email"],
                "phone": student["phone"],
                "department": student["department"],
                "year": student["year"],
                "blood_group": student["blood_group"]
            })

        return jsonify(student_list)

    except Exception as e:

        print("Database error:", e)

        return jsonify({
            "success": False,
            "message": "Could not load students"
        }), 500


# -------------------------------------------------
# START SERVER
# -------------------------------------------------

create_database()

if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )