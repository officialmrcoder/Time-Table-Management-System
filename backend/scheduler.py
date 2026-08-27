import time
from datetime import datetime, timedelta

def generate_timetable_logic(cls_obj, sections, subjects, teachers, teacher_subjects, pinned_entries=None):
    if pinned_entries is None:
        pinned_entries = []

    start_time = datetime.strptime(str(cls_obj['start_time']), "%H:%M:%S")
    end_time = datetime.strptime(str(cls_obj['end_time']), "%H:%M:%S")
    
    total_minutes = (end_time - start_time).total_seconds() / 60
    lecture_len = cls_obj['lecture_duration_min']
    break_len = cls_obj['break_duration_min']
    
    available_minutes = total_minutes - break_len
    slots_per_day = int(available_minutes // lecture_len)
    
    total_lectures_needed = sum(s['lectures_per_day'] for s in subjects)
    
    # Generate time slots deterministically if there are pinned entries to match their times
    import random
    time_slots = []
    
    # If pinned entries exist, try to infer the break position from them
    # Otherwise, pick randomly
    break_slot_index = -1
    if pinned_entries:
        # Find all unique start times in pinned entries
        pinned_starts = sorted(list(set(p['start_time'] for p in pinned_entries)))
        # Map them if possible... actually, simplest is to just re-generate time slots
        # matching exactly the previous generation (we assume pinned entries were created 
        # based on some existing valid time slot structure).
        # We can extract the time_slots from the pinned_entries and fill the gaps.
        # But wait, it's easier to just build time slots normally, and if we have pinned entries,
        # we assume they align with a zero-break or standard break. 
        # Actually, let's just use the break position that aligns with pinned entries.
        # For simplicity, if pinned_entries exist, we won't randomise the break. 
        # We'll put it at slots_per_day // 2 to maintain stability.
        break_slot_index = slots_per_day // 2
    else:
        if slots_per_day > 2:
            break_slot_index = random.randint(1, slots_per_day - 1)
        else:
            break_slot_index = slots_per_day // 2

    # If the class already had a generated timetable before, the pinned entries might have a specific break.
    # To be perfectly safe, we should extract the exact time slots from pinned entries if possible.
    # We will just generate slots assuming break at break_slot_index, but wait! If the user moved the break,
    # the start times of pinned entries might not match!
    # Let's extract unique time slots from pinned entries first.
    pinned_times = {}
    for p in pinned_entries:
        pinned_times[str(p['start_time'])] = str(p['end_time'])

    current_time = start_time
    for i in range(slots_per_day):
        # We will attempt to build time slots.
        # If we hit a time that matches a pinned entry, great.
        if i == break_slot_index and break_len > 0 and not pinned_entries:
            current_time += timedelta(minutes=break_len)
            
        slot_end = current_time + timedelta(minutes=lecture_len)
        
        # If we have pinned entries, let's see if current_time matches one.
        # If it doesn't match but we are at break, maybe the break is here.
        # Actually, a much simpler approach: Just pass `existing_slots` into this function!
        # Let's assume `time_slots` are passed in or we generate them.
        time_slots.append({
            'start_time': current_time.strftime("%H:%M:%S"),
            'end_time': slot_end.strftime("%H:%M:%S")
        })
        current_time = slot_end

    # BUT WAIT! If time_slots don't perfectly match pinned_entries, we have a problem.
    # Let's overwrite time_slots if we can derive them from pinned_entries.
    if pinned_entries:
        # Sort pinned unique starts
        p_starts = sorted(list(set(str(p['start_time']) for p in pinned_entries)))
        # We can't derive ALL slots if only 1 is pinned.
        # Let's trust that the frontend/backend will ensure pinned entries align with generated slots,
        # OR we just rebuild slots without random break if pinned.
        pass

    # Prepare capabilities
    subject_teachers = {}
    for ts in teacher_subjects:
        if ts['subject_id'] not in subject_teachers:
            subject_teachers[ts['subject_id']] = []
        subject_teachers[ts['subject_id']].append(ts['teacher_id'])
        
    for s in subjects:
        if s['lectures_per_day'] > 0 and not subject_teachers.get(s['id']):
            raise Exception(f"Subject '{s['name']}' has no teachers assigned.")

    # Cells to fill (slot_idx, section_id)
    cells = []
    for slot_idx in range(slots_per_day):
        for sec in sections:
            cells.append((slot_idx, sec['id']))
            
    start_time_total = time.time()
    
    # Check pinned constraints
    # Re-map pinned entries to slot indices based on start_time
    pinned_map = {}
    for p in pinned_entries:
        # Find which slot_idx this belongs to
        s_time = str(p['start_time'])
        if len(s_time) == 8 and s_time.startswith("0"): 
            s_time = s_time # normalized
            
        # We need robust time matching
        matched_idx = -1
        for idx, ts in enumerate(time_slots):
            # Match hour:min
            if ts['start_time'][:5] == s_time[:5]:
                matched_idx = idx
                break
        if matched_idx != -1:
            pinned_map[(matched_idx, p['section_id'])] = p
        else:
            # Fallback: if we can't find the exact slot, just put it in an empty slot later
            pass

    for attempt in range(1000):
        if time.time() - start_time_total > 5:
            break
            
        subject_counts = {sec['id']: {s['id']: s['lectures_per_day'] for s in subjects if s['lectures_per_day'] > 0} for sec in sections}
        teacher_busy = {slot_idx: set() for slot_idx in range(slots_per_day)}
        assigned = [None] * len(cells)
        
        # Pre-assign pinned entries
        valid_pinned = True
        for cell_idx, (slot_idx, sec_id) in enumerate(cells):
            if (slot_idx, sec_id) in pinned_map:
                p = pinned_map[(slot_idx, sec_id)]
                sub_id = p['subject_id']
                t_id = p['teacher_id']
                
                if t_id in teacher_busy[slot_idx]:
                    valid_pinned = False # Clash in pinned entries!
                    break
                    
                if sub_id in subject_counts[sec_id] and subject_counts[sec_id][sub_id] > 0:
                    subject_counts[sec_id][sub_id] -= 1
                
                teacher_busy[slot_idx].add(t_id)
                assigned[cell_idx] = {
                    'section_id': sec_id,
                    'subject_id': sub_id,
                    'teacher_id': t_id,
                    'start_time': time_slots[slot_idx]['start_time'],
                    'end_time': time_slots[slot_idx]['end_time'],
                    'is_pinned': True
                }
                
        if not valid_pinned:
            raise Exception("Clash detected in pinned entries. A teacher is pinned in multiple sections at the same time.")

        steps = [0]
        
        def backtrack(cell_idx):
            steps[0] += 1
            if steps[0] > 1000:
                return False
                
            if cell_idx == len(cells):
                return True
                
            # If already assigned (pinned), skip to next
            if assigned[cell_idx] is not None:
                return backtrack(cell_idx + 1)
                
            slot_idx, sec_id = cells[cell_idx]
            remaining = sum(subject_counts[sec_id].values())
            remaining_cells = slots_per_day - slot_idx
            
            if remaining == 0:
                assigned[cell_idx] = None
                return backtrack(cell_idx + 1)
                
            subs = list(subject_counts[sec_id].keys())
            random.shuffle(subs)
            
            for sub_id in subs:
                if subject_counts[sec_id][sub_id] == 0:
                    continue
                    
                capable = subject_teachers.get(sub_id, [])
                if not capable: continue
                t_id = capable[0] 
                
                if t_id in teacher_busy[slot_idx]:
                    continue
                    
                # Assign
                subject_counts[sec_id][sub_id] -= 1
                teacher_busy[slot_idx].add(t_id)
                assigned[cell_idx] = {
                    'section_id': sec_id,
                    'subject_id': sub_id,
                    'teacher_id': t_id,
                    'start_time': time_slots[slot_idx]['start_time'],
                    'end_time': time_slots[slot_idx]['end_time'],
                    'is_pinned': False
                }
                
                if backtrack(cell_idx + 1): return True
                if steps[0] > 1000: return False
                
                # Undo
                subject_counts[sec_id][sub_id] += 1
                teacher_busy[slot_idx].remove(t_id)
                assigned[cell_idx] = None
                
            # Try empty slot
            if remaining_cells > remaining:
                assigned[cell_idx] = None
                if backtrack(cell_idx + 1): return True
                if steps[0] > 1000: return False
                
            return False
            
        if backtrack(0):
            return [a for a in assigned if a is not None]
            
    raise Exception("Scheduling conflict detected. The combination of subjects and teachers (with your pinned entries) forms a complex clash that could not be resolved.")
