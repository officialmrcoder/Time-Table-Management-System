from flask import Blueprint, request, jsonify
from db_config import get_db_connection
import mysql.connector
from scheduler import generate_timetable_logic

timetable_bp = Blueprint('timetable', __name__)

@timetable_bp.route('/timetable/<int:class_id>', methods=['GET'])
def get_timetable(class_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT t.id, t.section_id, sec.name as section_name, 
               t.start_time, t.end_time, 
               t.subject_id, sub.name as subject_name,
               t.teacher_id, teach.name as teacher_name,
               t.is_proxy, t.is_pinned
        FROM timetable_entries t
        JOIN sections sec ON t.section_id = sec.id
        JOIN subjects sub ON t.subject_id = sub.id
        JOIN teachers teach ON t.teacher_id = teach.id
        WHERE t.class_id = %s
    """, (class_id,))
    entries = cursor.fetchall()
    
    for e in entries:
        e['start_time'] = str(e['start_time'])
        e['end_time'] = str(e['end_time'])
        e['is_proxy'] = bool(e.get('is_proxy', 0))
        e['is_pinned'] = bool(e.get('is_pinned', 0))
        
    cursor.close()
    conn.close()
    return jsonify(entries)

@timetable_bp.route('/generate-timetable/<int:class_id>', methods=['POST'])
def generate_timetable(class_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("SELECT * FROM classes WHERE id = %s", (class_id,))
        cls_obj = cursor.fetchone()
        if not cls_obj:
            return jsonify({"error": "Class not found"}), 404
            
        cursor.execute("SELECT * FROM sections WHERE class_id = %s", (class_id,))
        sections = cursor.fetchall()
        if not sections:
            return jsonify({"error": "No sections created for this class"}), 400
            
        cursor.execute("SELECT * FROM subjects WHERE class_id = %s", (class_id,))
        subjects = cursor.fetchall()
        
        cursor.execute("SELECT * FROM teachers WHERE class_id = %s", (class_id,))
        teachers = cursor.fetchall()
        
        cursor.execute("""
            SELECT ts.teacher_id, ts.subject_id 
            FROM teacher_subjects ts
            JOIN teachers t ON ts.teacher_id = t.id
            WHERE t.class_id = %s
        """, (class_id,))
        teacher_subjects = cursor.fetchall()
        
        cursor.execute("SELECT * FROM timetable_entries WHERE class_id = %s AND is_pinned = TRUE", (class_id,))
        pinned_entries = cursor.fetchall()
        
        cursor.execute("DELETE FROM timetable_entries WHERE class_id = %s", (class_id,))
        
        schedule = generate_timetable_logic(cls_obj, sections, subjects, teachers, teacher_subjects, pinned_entries)
        
        for entry in schedule:
            cursor.execute("""
                INSERT INTO timetable_entries (class_id, section_id, start_time, end_time, subject_id, teacher_id, is_pinned)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                class_id,
                entry['section_id'],
                entry['start_time'],
                entry['end_time'],
                entry['subject_id'],
                entry['teacher_id'],
                entry.get('is_pinned', False)
            ))
            
        conn.commit()
        return jsonify({"message": "Timetable generated successfully", "entries": schedule})
        
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@timetable_bp.route('/timetable/<int:class_id>', methods=['DELETE'])
def clear_timetable(class_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM timetable_entries WHERE class_id = %s", (class_id,))
        conn.commit()
        return jsonify({"message": "Timetable cleared"})
    finally:
        cursor.close()
        conn.close()

@timetable_bp.route('/timetable/entry', methods=['POST'])
def create_entry():
    data = request.json
    class_id = data.get('class_id')
    section_id = data.get('section_id')
    start_time = data.get('start_time')
    end_time = data.get('end_time')
    subject_id = data.get('subject_id')
    teacher_id = data.get('teacher_id')
    
    if not all([class_id, section_id, start_time, end_time, subject_id, teacher_id]):
        return jsonify({"error": "All fields required: class_id, section_id, start_time, end_time, subject_id, teacher_id"}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Verify teacher can teach this subject
        cursor.execute("SELECT * FROM teacher_subjects WHERE teacher_id = %s AND subject_id = %s", (teacher_id, subject_id))
        if not cursor.fetchone():
            return jsonify({"error": "Selected teacher cannot teach this subject."}), 400
        
        # Check section clash: section already has entry at this time
        cursor.execute("""
            SELECT id FROM timetable_entries 
            WHERE section_id = %s 
              AND start_time < %s 
              AND end_time > %s
        """, (section_id, end_time, start_time))
        if cursor.fetchone():
            return jsonify({"error": "Clash! This section already has a lecture at this time."}), 409
        
        # Check teacher clash: teacher busy in another section this time
        cursor.execute("""
            SELECT id, sec.name as section_name FROM timetable_entries t
            JOIN sections sec ON t.section_id = sec.id
            WHERE teacher_id = %s 
              AND start_time < %s 
              AND end_time > %s
        """, (teacher_id, end_time, start_time))
        clash = cursor.fetchone()
        if clash:
            return jsonify({"error": f"Clash! Teacher is already teaching in section '{clash['section_name']}' at this time."}), 409
        
        cursor.execute("""
            INSERT INTO timetable_entries (class_id, section_id, start_time, end_time, subject_id, teacher_id, is_proxy)
            VALUES (%s, %s, %s, %s, %s, %s, FALSE)
        """, (class_id, section_id, start_time, end_time, subject_id, teacher_id))
        conn.commit()
        return jsonify({"message": "Entry created", "id": cursor.lastrowid}), 201
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 400
    finally:
        cursor.close()
        conn.close()


@timetable_bp.route('/timetable/entry/<int:entry_id>', methods=['PUT'])
def update_entry(entry_id):
    data = request.json
    new_sec      = data.get('section_id')
    new_start    = data.get('start_time')
    new_end      = data.get('end_time')
    new_subject  = data.get('subject_id')
    new_teacher  = data.get('teacher_id')

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM timetable_entries WHERE id = %s", (entry_id,))
        entry = cursor.fetchone()
        if not entry:
            return jsonify({"error": "Entry not found"}), 404

        section_id = new_sec     if new_sec     is not None else entry['section_id']
        start_time = new_start   if new_start   is not None else str(entry['start_time'])
        end_time   = new_end     if new_end     is not None else str(entry['end_time'])
        subject_id = new_subject if new_subject is not None else entry['subject_id']
        teacher_id = new_teacher if new_teacher is not None else entry['teacher_id']

        old_start = str(entry['start_time'])
        old_end   = str(entry['end_time'])
        old_sec   = entry['section_id']

        # -------------------------------------------------------
        # Check if destination slot is occupied in the same section
        # If yes → SWAP the two entries (no real clash, just exchange)
        # -------------------------------------------------------
        cursor.execute("""
            SELECT id FROM timetable_entries
            WHERE section_id = %s
              AND id != %s
              AND start_time = %s
        """, (section_id, entry_id, start_time))
        occupant = cursor.fetchone()

        if occupant:
            occupant_id = occupant['id']
            # Swap: move occupant to old slot, move dragged entry to new slot
            cursor.execute("""
                UPDATE timetable_entries
                SET start_time = %s, end_time = %s, section_id = %s
                WHERE id = %s
            """, (old_start, old_end, old_sec, occupant_id))
            cursor.execute("""
                UPDATE timetable_entries
                SET start_time = %s, end_time = %s, section_id = %s
                WHERE id = %s
            """, (start_time, end_time, section_id, entry_id))
            conn.commit()
            return jsonify({"message": "Entries swapped successfully"})

        # No occupant – simple move, but still check teacher clash
        cursor.execute("""
            SELECT id, sec.name as section_name FROM timetable_entries t
            JOIN sections sec ON t.section_id = sec.id
            WHERE teacher_id = %s
              AND id != %s
              AND start_time < %s
              AND end_time   > %s
        """, (teacher_id, entry_id, end_time, start_time))
        clash = cursor.fetchone()
        if clash:
            return jsonify({"error": f"Clash! Teacher is already teaching in section '{clash['section_name']}' at this time."}), 409

        cursor.execute("""
            UPDATE timetable_entries
            SET section_id = %s, start_time = %s, end_time = %s, subject_id = %s, teacher_id = %s
            WHERE id = %s
        """, (section_id, start_time, end_time, subject_id, teacher_id, entry_id))

        conn.commit()
        return jsonify({"message": "Updated successfully"})
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 400
    finally:
        cursor.close()
        conn.close()

@timetable_bp.route('/proxy', methods=['POST'])
def proxy_teacher():
    # User sends: entry_id, new_teacher_id
    data = request.json
    entry_id = data.get('entry_id')
    new_teacher_id = data.get('new_teacher_id')
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM timetable_entries WHERE id = %s", (entry_id,))
        entry = cursor.fetchone()
        
        # Check if new teacher is busy
        cursor.execute("""
            SELECT id FROM timetable_entries 
            WHERE teacher_id = %s 
              AND start_time < %s 
              AND end_time > %s
        """, (new_teacher_id, entry['end_time'], entry['start_time']))
        if cursor.fetchone():
            return jsonify({"error": "Selected teacher is already busy at this time!"}), 409
            
        # Determine if this is a proxy or reverting to original teacher
        cursor.execute("SELECT * FROM teacher_subjects WHERE teacher_id = %s AND subject_id = %s", (new_teacher_id, entry['subject_id']))
        is_original = cursor.fetchone() is not None
        is_proxy = not is_original
        
        cursor.execute("UPDATE timetable_entries SET teacher_id = %s, is_proxy = %s WHERE id = %s", (new_teacher_id, is_proxy, entry_id))
        conn.commit()
        return jsonify({"message": "Proxy adjusted successfully"})
    finally:
        cursor.close()
        conn.close()

@timetable_bp.route('/timetable/<int:class_id>/move_break', methods=['POST'])
def move_break(class_id):
    direction = request.json.get('direction')
    if direction not in ['up', 'down']:
        return jsonify({"error": "Invalid direction"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Get class info
        cursor.execute("SELECT * FROM classes WHERE id = %s", (class_id,))
        cls_obj = cursor.fetchone()
        
        break_len = cls_obj['break_duration_min']
        if break_len == 0:
            return jsonify({"error": "This class has no break to move."}), 400

        # Get unique time slots
        cursor.execute("""
            SELECT DISTINCT start_time, end_time 
            FROM timetable_entries 
            WHERE class_id = %s 
            ORDER BY start_time
        """, (class_id,))
        slots = cursor.fetchall()

        if not slots:
            return jsonify({"error": "Timetable is empty."}), 400

        # Find current break index (the index of the slot AFTER the break)
        # i.e. if break is between slot 1 and 2, the break index is 2
        from datetime import timedelta
        
        break_idx = -1
        for i in range(1, len(slots)):
            prev_end = slots[i-1]['end_time']
            curr_start = slots[i]['start_time']
            if prev_end != curr_start:
                break_idx = i
                break

        if break_idx == -1:
            # If no break found but break_len > 0, it means break is at the end or beginning.
            # We'll just assume it's at the end.
            break_idx = len(slots)

        new_break_idx = break_idx
        if direction == 'up' and break_idx > 1:
            new_break_idx -= 1
        elif direction == 'down' and break_idx < len(slots):
            new_break_idx += 1
        else:
            return jsonify({"message": "Cannot move break further."}), 200

        if new_break_idx == break_idx:
            return jsonify({"message": "No change."}), 200

        # Generate new time slots
        from datetime import datetime
        start_time = datetime.strptime(str(cls_obj['start_time']), "%H:%M:%S")
        lecture_len = cls_obj['lecture_duration_min']
        
        new_time_slots = []
        current_time = start_time
        
        for i in range(len(slots)):
            if i == new_break_idx:
                current_time += timedelta(minutes=break_len)
                
            slot_end = current_time + timedelta(minutes=lecture_len)
            new_time_slots.append({
                'start_time': current_time.strftime("%H:%M:%S"),
                'end_time': slot_end.strftime("%H:%M:%S")
            })
            current_time = slot_end

        # Map old to new
        for i in range(len(slots)):
            old_start = str(slots[i]['start_time'])
            new_start = new_time_slots[i]['start_time']
            new_end = new_time_slots[i]['end_time']
            
            cursor.execute("""
                UPDATE timetable_entries 
                SET start_time = %s, end_time = %s 
                WHERE class_id = %s AND start_time = %s
            """, (new_start, new_end, class_id, old_start))

        conn.commit()
        return jsonify({"message": "Break moved successfully."})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@timetable_bp.route('/timetable/pin', methods=['POST'])
def pin_entry():
    data = request.json
    class_id = data.get('class_id')
    section_id = data.get('section_id')
    start_time = data.get('start_time')
    end_time = data.get('end_time')
    subject_id = data.get('subject_id')
    teacher_id = data.get('teacher_id')
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Verify teacher can teach subject
        cursor.execute("SELECT * FROM teacher_subjects WHERE teacher_id = %s AND subject_id = %s", (teacher_id, subject_id))
        if not cursor.fetchone():
            return jsonify({"error": "Selected teacher cannot teach this subject."}), 400
            
        # Insert as pinned. Let generate_timetable handle clashes or we can do a quick check here
        # Quick check: Is this teacher already pinned at this time?
        cursor.execute('''
            SELECT * FROM timetable_entries 
            WHERE teacher_id = %s AND start_time = %s AND is_pinned = TRUE
        ''', (teacher_id, start_time))
        if cursor.fetchone():
            return jsonify({"error": "Clash! Teacher is already manually pinned to another section at this time."}), 409
            
        cursor.execute('''
            INSERT INTO timetable_entries (class_id, section_id, start_time, end_time, subject_id, teacher_id, is_pinned)
            VALUES (%s, %s, %s, %s, %s, %s, TRUE)
        ''', (class_id, section_id, start_time, end_time, subject_id, teacher_id))
        conn.commit()
        return jsonify({"message": "Lecture pinned successfully"})
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 400
    finally:
        cursor.close()
        conn.close()

@timetable_bp.route('/timetable/unpin/<int:entry_id>', methods=['POST'])
def unpin_entry(entry_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE timetable_entries SET is_pinned = FALSE WHERE id = %s", (entry_id,))
        conn.commit()
        return jsonify({"message": "Lecture unpinned"})
    finally:
        cursor.close()
        conn.close()
@timetable_bp.route('/timetable/<int:class_id>/slots', methods=['GET'])
def get_time_slots(class_id):
    """Returns all valid time slots for a class based on its timing config."""
    from datetime import datetime, timedelta
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM classes WHERE id = %s", (class_id,))
        cls_obj = cursor.fetchone()
        if not cls_obj:
            return jsonify({"error": "Class not found"}), 404

        # Check if timetable exists - if so, use real slot times (with correct break position)
        cursor.execute("""
            SELECT DISTINCT start_time, end_time FROM timetable_entries
            WHERE class_id = %s ORDER BY start_time
        """, (class_id,))
        existing_slots = cursor.fetchall()

        if existing_slots:
            slots = [{"start_time": str(s["start_time"]), "end_time": str(s["end_time"])} for s in existing_slots]
        else:
            # No timetable yet: compute slots from class config (break at midpoint)
            start_time = datetime.strptime(str(cls_obj['start_time']), "%H:%M:%S")
            end_time   = datetime.strptime(str(cls_obj['end_time']), "%H:%M:%S")
            lecture_len = cls_obj['lecture_duration_min']
            break_len   = cls_obj['break_duration_min']
            available_minutes = (end_time - start_time).total_seconds() / 60 - break_len
            slots_per_day = int(available_minutes // lecture_len)
            break_slot_index = slots_per_day // 2

            current_time = start_time
            slots = []
            for i in range(slots_per_day):
                if i == break_slot_index and break_len > 0:
                    current_time += timedelta(minutes=break_len)
                slot_end = current_time + timedelta(minutes=lecture_len)
                slots.append({
                    "start_time": current_time.strftime("%H:%M:%S"),
                    "end_time":   slot_end.strftime("%H:%M:%S")
                })
                current_time = slot_end

        return jsonify(slots)
    finally:
        cursor.close()
        conn.close()
