import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getSections, createSection, deleteSection, updateSection,
  getSubjects, createSubject, deleteSubject, updateSubject,
  getTeachers, createTeacher, deleteTeacher, updateTeacher,
  getClasses
} from '../api';
import { Trash2, Plus, ArrowRight, User, BookOpen, Layers, AlertTriangle, CheckCircle, Edit2, X } from 'lucide-react';

export default function ClassSetup() {
  const { classId } = useParams();
  const navigate = useNavigate();

  const [classInfo, setClassInfo] = useState(null);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // Section form
  const [sectionName, setSectionName] = useState('');
  const [editSecId, setEditSecId] = useState(null);

  // Subject form
  const [subName, setSubName] = useState('');
  const [subLecPerDay, setSubLecPerDay] = useState(1);
  const [editSubId, setEditSubId] = useState(null);

  // Teacher form
  const [teachName, setTeachName] = useState('');
  const [teachSubjects, setTeachSubjects] = useState([]);
  const [editTeachId, setEditTeachId] = useState(null);

  useEffect(() => {
    loadAll();
  }, [classId]);

  const loadAll = async () => {
    try {
      const [classRes, secRes, subRes, teachRes] = await Promise.all([
        getClasses(),
        getSections(classId),
        getSubjects(classId),
        getTeachers(classId),
      ]);
      const found = classRes.data.find(c => c.id === parseInt(classId));
      setClassInfo(found);
      setSections(secRes.data);
      setSubjects(subRes.data);
      setTeachers(teachRes.data);
    } catch (err) {
      alert('Failed to load data');
    }
  };

  // Calculate available slots per day from class timing
  const calcSlotsPerDay = () => {
    if (!classInfo) return 0;
    const start = classInfo.start_time.split(':').map(Number);
    const end = classInfo.end_time.split(':').map(Number);
    const startMins = start[0] * 60 + start[1];
    const endMins = end[0] * 60 + end[1];
    const totalMins = endMins - startMins;
    const available = totalMins - (classInfo.break_duration_min || 0);
    return Math.floor(available / classInfo.lecture_duration_min);
  };

  const slotsPerDay = calcSlotsPerDay();
  const totalLecturesNeeded = subjects.reduce((s, sub) => s + sub.lectures_per_day, 0);
  const isSlotOk = totalLecturesNeeded <= slotsPerDay;

  const handleAddSection = async (e) => {
    e.preventDefault();
    if (!sectionName.trim()) return;
    try {
      if (editSecId) {
        await updateSection(editSecId, { name: sectionName });
        setEditSecId(null);
      } else {
        await createSection({ class_id: parseInt(classId), name: sectionName });
      }
      setSectionName('');
      loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save section');
    }
  };

  const startEditSection = (sec) => {
    setEditSecId(sec.id);
    setSectionName(sec.name);
  };

  const handleDeleteSection = async (id) => {
    if (!confirm('Delete this section? All timetable entries for it will also be removed.')) return;
    try {
      await deleteSection(id);
      if (editSecId === id) { setEditSecId(null); setSectionName(''); }
      loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!subName.trim()) return;
    const val = parseInt(subLecPerDay);
    if (val < 0 || val > slotsPerDay) {
      alert(`Lectures per day must be between 0 and ${slotsPerDay} (total available slots in your class timing).`);
      return;
    }
    
    // Check if adding/editing exceeds limit
    const currentSubjectLec = editSubId ? subjects.find(s => s.id === editSubId)?.lectures_per_day || 0 : 0;
    const addedLec = val - currentSubjectLec;
    
    if (totalLecturesNeeded + addedLec > slotsPerDay) {
      alert(`Cannot save! This would make total ${totalLecturesNeeded + addedLec}, but only ${slotsPerDay} slots exist per day.`);
      return;
    }
    try {
      if (editSubId) {
        await updateSubject(editSubId, { name: subName, lectures_per_day: val });
        setEditSubId(null);
      } else {
        await createSubject({ class_id: parseInt(classId), name: subName, lectures_per_day: val });
      }
      setSubName('');
      setSubLecPerDay(1);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save subject');
    }
  };

  const startEditSubject = (sub) => {
    setEditSubId(sub.id);
    setSubName(sub.name);
    setSubLecPerDay(sub.lectures_per_day);
  };

  const handleDeleteSubject = async (id) => {
    if (!confirm('Delete this subject?')) return;
    try {
      await deleteSubject(id);
      if (editSubId === id) { setEditSubId(null); setSubName(''); setSubLecPerDay(1); }
      loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    if (!teachName.trim()) return;
    try {
      if (editTeachId) {
        await updateTeacher(editTeachId, { name: teachName, subjects: teachSubjects.map(Number) });
        setEditTeachId(null);
      } else {
        await createTeacher({ class_id: parseInt(classId), name: teachName, subjects: teachSubjects.map(Number) });
      }
      setTeachName('');
      setTeachSubjects([]);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save teacher');
    }
  };

  const startEditTeacher = (teach) => {
    setEditTeachId(teach.id);
    setTeachName(teach.name);
    setTeachSubjects(teach.subjects.map(s => s.id));
  };

  const handleDeleteTeacher = async (id) => {
    if (!confirm('Delete this teacher?')) return;
    try {
      await deleteTeacher(id);
      if (editTeachId === id) { setEditTeachId(null); setTeachName(''); setTeachSubjects([]); }
      loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  const toggleTeachSubject = (id) => {
    setTeachSubjects(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Class Setup</h1>
          {classInfo && (
            <p className="text-sm text-slate-500 mt-1 font-medium">
              {classInfo.name} &nbsp;·&nbsp; {classInfo.start_time?.substring(0,5)} – {classInfo.end_time?.substring(0,5)} &nbsp;·&nbsp; {classInfo.lecture_duration_min}m lectures
            </p>
          )}
        </div>
        <button
          onClick={() => navigate(`/class/${classId}/timetable`)}
          className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 transition shadow-md hover:shadow-lg"
        >
          Generate / View Timetable <ArrowRight size={18} />
        </button>
      </div>

      {/* Slot Status Bar */}
      {classInfo && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${isSlotOk ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          {isSlotOk
            ? <CheckCircle size={22} className="text-green-600 shrink-0" />
            : <AlertTriangle size={22} className="text-red-600 shrink-0" />
          }
          <div className="text-sm">
            <span className={`font-bold ${isSlotOk ? 'text-green-800' : 'text-red-800'}`}>
              Slots used: {totalLecturesNeeded} / {slotsPerDay} per day
            </span>
            <span className={`ml-2 ${isSlotOk ? 'text-green-600' : 'text-red-600'}`}>
              {isSlotOk
                ? `(${slotsPerDay - totalLecturesNeeded} slots free — timetable can be generated)`
                : `Too many lectures! Remove some subjects or extend your class end time.`}
            </span>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">

        {/* ---- SECTIONS ---- */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Layers size={20} className="text-purple-600" />
            Sessions / Sections
          </h2>
          <p className="text-xs text-gray-500 bg-purple-50 border border-purple-100 rounded-lg p-2">
            Ye ek saath chalti hain — jaise "Jan Batch", "Feb Batch", "Section A". Timetable mein ye columns ke roop mein dikhti hain.
          </p>
          
          <form onSubmit={handleAddSection} className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={sectionName}
                onChange={e => setSectionName(e.target.value)}
                placeholder="e.g. Jan, Feb, Sec-A"
                className="flex-1 border border-gray-300 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
              />
              <button type="submit" className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition">
                {editSecId ? <CheckCircle size={18} /> : <Plus size={18} />}
              </button>
            </div>
            {editSecId && (
              <button type="button" onClick={() => { setEditSecId(null); setSectionName(''); }} className="text-xs text-gray-500 hover:text-gray-700 text-left flex items-center gap-1">
                <X size={12}/> Cancel Edit
              </button>
            )}
          </form>

          <ul className="divide-y rounded-lg border border-gray-100 overflow-hidden">
            {sections.map(s => (
              <li key={s.id} className="flex justify-between items-center px-4 py-3 bg-gray-50 hover:bg-gray-100 transition group">
                <span className="font-semibold text-gray-800">{s.name}</span>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEditSection(s)} className="text-purple-400 hover:text-purple-600 transition" title="Edit">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDeleteSection(s.id)} className="text-red-400 hover:text-red-600 transition" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
            {sections.length === 0 && (
              <li className="px-4 py-3 text-gray-400 text-sm text-center">No sessions yet</li>
            )}
          </ul>
        </div>

        {/* ---- SUBJECTS ---- */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <BookOpen size={20} className="text-blue-600" />
            Subjects
          </h2>
          <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg p-2">
            <strong>Lectures/day = 1</strong> ka matlab hai subject rozana sirf ek slot le ga. Zyada set karo to ek din mein zyada baar aayega.
          </p>

          <form onSubmit={handleAddSubject} className="space-y-2">
            <input
              type="text"
              required
              value={subName}
              onChange={e => setSubName(e.target.value)}
              placeholder="Subject name (e.g. Math)"
              className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-400"
            />
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap font-semibold">Slots/day:</label>
              <input
                type="number"
                required
                min="0"
                max={slotsPerDay || 10}
                value={subLecPerDay}
                onChange={e => setSubLecPerDay(e.target.value)}
                className="w-20 border border-gray-300 px-2 py-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-400"
              />
              <button type="submit" className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition flex items-center justify-center gap-1">
                {editSubId ? <><CheckCircle size={16} /> Save</> : <><Plus size={16} /> Add</>}
              </button>
            </div>
            {editSubId && (
              <button type="button" onClick={() => { setEditSubId(null); setSubName(''); setSubLecPerDay(1); }} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                <X size={12}/> Cancel Edit
              </button>
            )}
          </form>

          <ul className="divide-y rounded-lg border border-gray-100 overflow-hidden">
            {subjects.map(s => (
              <li key={s.id} className="flex justify-between items-center px-4 py-3 bg-gray-50 hover:bg-gray-100 transition group">
                <div>
                  <p className="font-semibold text-gray-800">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.lectures_per_day} slot(s) per day</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEditSubject(s)} className="text-blue-400 hover:text-blue-600 transition" title="Edit">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDeleteSubject(s.id)} className="text-red-400 hover:text-red-600 transition" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
            {subjects.length === 0 && (
              <li className="px-4 py-3 text-gray-400 text-sm text-center">No subjects yet</li>
            )}
          </ul>
        </div>

        {/* ---- TEACHERS ---- */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <User size={20} className="text-green-600" />
            Teachers
          </h2>
          <p className="text-xs text-gray-500 bg-green-50 border border-green-100 rounded-lg p-2">
            Assign which subjects each teacher can teach. Agar same time par 2 sections hain to 2 different teachers chahiye.
          </p>

          <form onSubmit={handleAddTeacher} className="space-y-3">
            <input
              type="text"
              required
              value={teachName}
              onChange={e => setTeachName(e.target.value)}
              placeholder="Teacher name"
              className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-green-400"
            />
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">Select subjects this teacher teaches:</p>
              <div className="flex flex-wrap gap-2">
                {subjects.map(s => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => toggleTeachSubject(s.id)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                      teachSubjects.includes(s.id)
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
                {subjects.length === 0 && <p className="text-xs text-gray-400">Add subjects first</p>}
              </div>
            </div>
            <button type="submit" className="w-full bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700 transition flex items-center justify-center gap-2">
              {editTeachId ? <><CheckCircle size={16} /> Save Teacher</> : <><Plus size={16} /> Add Teacher</>}
            </button>
            {editTeachId && (
              <button type="button" onClick={() => { setEditTeachId(null); setTeachName(''); setTeachSubjects([]); }} className="text-xs text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1 w-full">
                <X size={12}/> Cancel Edit
              </button>
            )}
          </form>

          <ul className="divide-y rounded-lg border border-gray-100 overflow-hidden">
            {teachers.map(t => (
              <li key={t.id} className="px-4 py-3 bg-gray-50 hover:bg-gray-100 transition group">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-800">{t.name}</p>
                    <p className="text-xs text-gray-500">
                      {t.subjects && t.subjects.length > 0
                        ? t.subjects.map(s => s.name).join(', ')
                        : 'No subjects assigned'}
                    </p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-2 mt-0.5">
                    <button onClick={() => startEditTeacher(t)} className="text-green-400 hover:text-green-600 transition" title="Edit">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDeleteTeacher(t.id)} className="text-red-400 hover:text-red-600 transition" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
            {teachers.length === 0 && (
              <li className="px-4 py-3 text-gray-400 text-sm text-center">No teachers yet</li>
            )}
          </ul>
        </div>

      </div>
    </div>
  );
}
