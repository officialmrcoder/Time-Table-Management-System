import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTimetable, generateTimetable, clearTimetable, proxyTeacher, getTeachers, moveBreak, getSubjects, pinLecture, unpinLecture, getTimeSlots, getSections } from '../api';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import { Loader2, Printer, Trash2, RefreshCw, UserCheck, ArrowLeft, ArrowUp, ArrowDown, Pin, PinOff, PlusCircle } from 'lucide-react';

const format12Hour = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  let hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${m} ${ampm}`;
};

// Proxy Modal - select replacement teacher
function ProxyModal({ entry, teachers, onClose, onConfirm }) {
  const [selectedTeacher, setSelectedTeacher] = useState('');

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-bold mb-2 text-gray-800">Assign Proxy Teacher</h3>
        <p className="text-sm text-gray-500 mb-4">
          Replace <span className="font-bold text-gray-700">{entry.teacher_name}</span> 
          ({entry.subject_name} at {format12Hour(entry.start_time)}) with:
        </p>
        <select
          value={selectedTeacher}
          onChange={e => setSelectedTeacher(e.target.value)}
          className="w-full border border-gray-300 p-2 rounded-lg mb-4 text-sm focus:ring-2 focus:ring-blue-400"
        >
          <option value="">-- Select Teacher --</option>
          {teachers.filter(t => t.id !== entry.teacher_id).map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <div className="flex gap-3">
          <button
            disabled={!selectedTeacher}
            onClick={() => onConfirm(entry.id, parseInt(selectedTeacher))}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition"
          >
            Confirm
          </button>
          <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-200 transition">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Pin Modal - manually assign a lecture
function PinModal({ classId, sections, timeSlots, teachers, subjects, onClose, onConfirm }) {
  const [sectionId, setSectionId] = useState('');
  const [slot, setSlot] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');

  const handleConfirm = () => {
    if (!sectionId || !slot || !subjectId || !teacherId) return;
    const [start_time, end_time] = slot.split('|');
    onConfirm({
      class_id: classId,
      section_id: parseInt(sectionId),
      start_time,
      end_time,
      subject_id: parseInt(subjectId),
      teacher_id: parseInt(teacherId)
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2"><Pin size={20}/> Pin Lecture</h3>
        
        <div className="space-y-3 mb-6">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Session (Section)</label>
            <select value={sectionId} onChange={e => setSectionId(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg text-sm">
              <option value="">-- Select Section --</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Time Slot</label>
            <select value={slot} onChange={e => setSlot(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg text-sm">
              <option value="">-- Select Time Slot --</option>
              {timeSlots.map(ts => (
                <option key={`${ts.start}|${ts.end}`} value={`${ts.start}|${ts.end}`}>
                  {format12Hour(ts.start)} - {format12Hour(ts.end)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Subject</label>
            <select value={subjectId} onChange={e => setSubjectId(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg text-sm">
              <option value="">-- Select Subject --</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Teacher</label>
            <select value={teacherId} onChange={e => setTeacherId(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg text-sm">
              <option value="">-- Select Teacher --</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            disabled={!sectionId || !slot || !subjectId || !teacherId}
            onClick={handleConfirm}
            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            Pin & Auto-Shift
          </button>
          <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-200 transition">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const SUB_COLORS = [
  'bg-blue-600 hover:bg-blue-700 ring-blue-300',
  'bg-emerald-600 hover:bg-emerald-700 ring-emerald-300',
  'bg-purple-600 hover:bg-purple-700 ring-purple-300',
  'bg-pink-600 hover:bg-pink-700 ring-pink-300',
  'bg-indigo-600 hover:bg-indigo-700 ring-indigo-300',
  'bg-teal-600 hover:bg-teal-700 ring-teal-300',
  'bg-rose-600 hover:bg-rose-700 ring-rose-300',
  'bg-cyan-600 hover:bg-cyan-700 ring-cyan-300',
];

function DraggableCell({ entry, onProxy, onUnpin }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: entry.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 } : undefined;

  const baseColor = SUB_COLORS[entry.subject_id % SUB_COLORS.length];
  const proxyColor = 'bg-orange-500 hover:bg-orange-600 ring-orange-300 border-2 border-dashed border-orange-200';
  const colorClass = entry.is_proxy ? proxyColor : baseColor;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`${colorClass} text-white p-1.5 rounded-lg shadow-sm cursor-grab active:cursor-grabbing transition-all text-left relative ${
        isDragging ? 'opacity-90 shadow-xl ring-2 scale-105' : ''
      }`}
    >
      {entry.is_pinned && (
        <div className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full p-0.5 shadow-sm text-white" title="Pinned Lecture">
          <Pin size={10} />
        </div>
      )}
      <p className="font-bold text-xs leading-tight">{entry.subject_name}</p>
      {entry.is_proxy ? (
        <p className="text-[10px] font-semibold text-white bg-black/20 px-1 py-0.5 rounded mt-0.5 inline-block leading-tight">
          Proxy: {entry.teacher_name}
        </p>
      ) : (
        <p className="text-[10px] text-white/90 mt-0.5 leading-tight">{entry.teacher_name}</p>
      )}
      <div className="flex gap-1 flex-wrap mt-1">
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onProxy(entry); }}
          className="no-print flex items-center gap-0.5 text-[9px] bg-white/20 hover:bg-white/30 px-1 py-0.5 rounded text-white transition w-max"
        >
          <UserCheck size={8} /> Proxy
        </button>
        {entry.is_pinned && (
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onUnpin(entry.id); }}
            className="no-print flex items-center gap-0.5 text-[9px] bg-red-500/80 hover:bg-red-500 px-1 py-0.5 rounded text-white transition w-max"
          >
            <PinOff size={8} /> Unpin
          </button>
        )}
      </div>
    </div>
  );
}

function DroppableCell({ id, items, sectionId, startTime, endTime, onProxy, onUnpin }) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { section_id: sectionId, start_time: startTime, end_time: endTime }
  });

  return (
    <td
      ref={setNodeRef}
      className={`border border-gray-200 p-1.5 align-top transition-colors ${
        isOver ? 'bg-blue-50 ring-2 ring-blue-300 ring-inset' : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex flex-col gap-1 min-h-[60px]">
        {items.map(item => (
          <DraggableCell key={item.id} entry={item} onProxy={onProxy} onUnpin={onUnpin} />
        ))}
      </div>
    </td>
  );
}

export default function Timetable() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [proxyEntry, setProxyEntry] = useState(null);
  const [showPinModal, setShowPinModal] = useState(false);

  const [pinSlots, setPinSlots] = useState([]);
  const [allSections, setAllSections] = useState([]);

  useEffect(() => {
    loadAll();
  }, [classId]);

  const loadAll = async () => {
    try {
      const [ttRes, teachRes, subRes, slotsRes, secRes] = await Promise.all([
        getTimetable(classId),
        getTeachers(classId),
        getSubjects(classId),
        getTimeSlots(classId),
        getSections(classId)
      ]);
      setEntries(ttRes.data);
      setTeachers(teachRes.data);
      setSubjects(subRes.data);
      setPinSlots(slotsRes.data);
      setAllSections(secRes.data);
    } catch (err) {
      setError('Failed to load');
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      await generateTimetable(classId);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Clear timetable? This will remove all entries including pinned ones.')) return;
    await clearTimetable(classId);
    setEntries([]);
  };

  const handleMoveBreak = async (direction) => {
    try {
      await moveBreak(classId, direction);
      await loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to move break.');
    }
  };

  const handleProxy = async (entryId, newTeacherId) => {
    try {
      await proxyTeacher(entryId, newTeacherId);
      setProxyEntry(null);
      await loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Clash! Teacher is already busy at this time.');
    }
  };

  const handlePin = async (data) => {
    try {
      await pinLecture(data);
      setShowPinModal(false);
      // Automatically re-generate so the rest shifts around it
      await handleGenerate();
    } catch (err) {
      alert(err.response?.data?.error || 'Clash! Could not pin lecture.');
    }
  };

  const handleUnpin = async (entryId) => {
    if (!confirm('Unpin this lecture?')) return;
    try {
      await unpinLecture(entryId);
      await loadAll();
    } catch (err) {
      alert('Failed to unpin');
    }
  };

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const { section_id, start_time, end_time } = over.data.current;
    try {
      const { moveEntry } = await import('../api');
      await moveEntry(active.id, { section_id, start_time, end_time });
      await loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Cannot move: clash detected!');
    }
  };

  // Build grid: rows = time slots, columns = sections
  const sections = [...new Map(entries.map(e => [e.section_id, { id: e.section_id, name: e.section_name }])).values()];
  const timeSlots = [...new Map(
    entries.map(e => [`${e.start_time}-${e.end_time}`, { start: e.start_time, end: e.end_time }])
  ).values()].sort((a, b) => a.start.localeCompare(b.start));

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-500 hover:text-gray-800 transition"
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">Daily Timetable</h1>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Sessions are shown as columns. Tap a cell to set proxy.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowPinModal(true)}
            className="bg-emerald-600 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-700 shadow-md hover:shadow-lg transition text-sm"
          >
            <Pin size={16} /> Pin Lecture
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-indigo-600 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 shadow-md hover:shadow-lg transition text-sm"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            Generate
          </button>
          {entries.length > 0 && (
            <>
              <button onClick={() => window.print()} className="bg-slate-200 text-slate-800 px-3 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-300 transition text-sm shadow-sm">
                <Printer size={16} /> Print
              </button>
              <button onClick={handleClear} className="bg-rose-100 text-rose-700 px-3 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-rose-200 transition text-sm shadow-sm">
                <Trash2 size={16} /> Clear
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center py-24 text-gray-500">
          <Loader2 className="animate-spin mb-4" size={48} />
          <p className="font-semibold">Generating clash-free timetable...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl py-20 text-center text-gray-400">
          <p className="text-lg font-semibold">No timetable generated yet.</p>
          <p className="text-sm mt-1">Click "Generate" above to create the daily schedule.</p>
        </div>
      ) : (
        <DndContext onDragEnd={handleDragEnd}>
          {/* overflow-x-auto ensures horizontal scroll on mobile */}
          <div className="print-container overflow-x-auto rounded-xl shadow border border-gray-200 bg-white">
            <table className="border-collapse text-center" style={{ minWidth: `${sections.length * 110 + 90}px` }}>
              <thead>
                <tr>
                  <th className="border-b-2 border-r-2 border-gray-200 bg-gray-100 p-2 font-bold text-gray-700 text-xs w-20 sticky left-0 z-10">
                    Time
                  </th>
                  {sections.map((sec, idx) => (
                    <th
                      key={sec.id}
                      className={`border-b-2 border-gray-200 bg-gray-100 p-2 font-bold text-gray-700 uppercase tracking-wider text-xs ${idx < sections.length - 1 ? 'border-r' : ''}`}
                    >
                      {sec.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot, ri) => {
                  // Check if there's a break gap before this slot
                  const prevSlot = timeSlots[ri - 1];
                  const hasBreakBefore = prevSlot && prevSlot.end !== slot.start;
                  const breakStart = hasBreakBefore ? prevSlot.end : null;
                  const breakEnd = hasBreakBefore ? slot.start : null;

                  return (
                    <>
                      {/* Break row if there's a gap between previous slot and this one */}
                      {hasBreakBefore && (
                        <tr key={`break-${ri}`} className="bg-amber-50">
                          <td className="border-r-2 border-b border-amber-200 bg-amber-100 p-2 font-bold text-amber-700 text-[10px] sticky left-0 z-10 w-20">
                            <div className="flex flex-col items-center gap-0">
                              <span className="text-amber-800 font-bold">{format12Hour(breakStart)}</span>
                              <span className="text-amber-400 text-[8px]">–</span>
                              <span className="text-amber-600">{format12Hour(breakEnd)}</span>
                            </div>
                          </td>
                          <td
                            colSpan={sections.length}
                            className="border-b border-amber-200 bg-amber-50 p-2 text-center relative"
                          >
                            <span className="inline-flex items-center gap-1.5 bg-amber-100 border border-amber-300 text-amber-700 font-bold text-xs px-3 py-1 rounded-full">
                              ☕ BREAK
                            </span>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-1 no-print">
                              <button onClick={() => handleMoveBreak('up')} className="text-amber-600 hover:text-amber-800 bg-amber-200 hover:bg-amber-300 p-0.5 rounded transition" title="Move Break Up">
                                <ArrowUp size={14} />
                              </button>
                              <button onClick={() => handleMoveBreak('down')} className="text-amber-600 hover:text-amber-800 bg-amber-200 hover:bg-amber-300 p-0.5 rounded transition" title="Move Break Down">
                                <ArrowDown size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Regular lecture row */}
                      <tr key={ri} className={ri % 2 === 0 ? '' : 'bg-gray-50/50'}>
                        <td className="border-r-2 border-b border-gray-200 bg-gray-50 p-2 font-semibold text-gray-600 text-[10px] sticky left-0 z-10 w-20">
                          <div className="flex flex-col items-center gap-0">
                            <span className="text-gray-800 font-bold">{format12Hour(slot.start)}</span>
                            <span className="text-gray-400 text-[8px]">–</span>
                            <span className="text-gray-600">{format12Hour(slot.end)}</span>
                          </div>
                        </td>
                        {sections.map((sec, ci) => {
                          const cellId = `${sec.id}-${slot.start}`;
                          const cellItems = entries.filter(e => e.section_id === sec.id && e.start_time === slot.start);
                          return (
                            <DroppableCell
                              key={cellId}
                              id={cellId}
                              items={cellItems}
                              sectionId={sec.id}
                              startTime={slot.start}
                              endTime={slot.end}
                              onProxy={setProxyEntry}
                              onUnpin={handleUnpin}
                            />
                          );
                        })}
                      </tr>
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </DndContext>
      )}

      {proxyEntry && (
        <ProxyModal
          entry={proxyEntry}
          teachers={teachers}
          onClose={() => setProxyEntry(null)}
          onConfirm={handleProxy}
        />
      )}

      {showPinModal && (
        <PinModal
          classId={classId}
          sections={allSections}
          timeSlots={pinSlots.map(s => ({ start: s.start_time, end: s.end_time }))}
          teachers={teachers}
          subjects={subjects}
          onClose={() => setShowPinModal(false)}
          onConfirm={handlePin}
        />
      )}
    </div>
  );
}


