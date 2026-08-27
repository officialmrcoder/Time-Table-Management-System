import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClasses, createClass, updateClass, deleteClass } from '../api';
import { Edit2, X, Clock, Settings, ArrowRight, Trash2 } from 'lucide-react';

export default function Dashboard() {
  const [classes, setClasses] = useState([]);
  const navigate = useNavigate();
  const [editId, setEditId] = useState(null);
  
  const initForm = {
    name: '',
    lecture_duration_min: 35,
    break_duration_min: 15,
    start_time: '08:00',
    end_time: '13:00'
  };
  const [formData, setFormData] = useState(initForm);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const { data } = await getClasses();
      setClasses(data);
    } catch (err) {
      alert('Failed to load classes');
    }
  };

  const handleEdit = (c) => {
    setEditId(c.id);
    setFormData({
      name: c.name,
      lecture_duration_min: c.lecture_duration_min,
      break_duration_min: c.break_duration_min,
      start_time: c.start_time.substring(0,5),
      end_time: c.end_time.substring(0,5)
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditId(null);
    setFormData(initForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    try {
      const payload = {
        ...formData,
        start_time: formData.start_time + (formData.start_time.length === 5 ? ':00' : ''),
        end_time: formData.end_time + (formData.end_time.length === 5 ? ':00' : '')
      };
      if (editId) {
        await updateClass(editId, payload);
      } else {
        await createClass(payload);
      }
      setFormData(initForm);
      setEditId(null);
      loadClasses();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save class');
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete class "${name}"? This will delete all its sections, subjects, teachers, and timetable!`)) return;
    try {
      await deleteClass(id);
      loadClasses();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete class');
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Classes Dashboard</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative">
        {editId && (
          <button onClick={cancelEdit} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
            <X size={24} />
          </button>
        )}
        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
          <Settings size={20} className="text-blue-600" />
          {editId ? 'Edit Class Timings' : 'Add New Class (e.g. 9th Grade)'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Class Name</label>
              <input type="text" required className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. 9th" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Lecture (mins)</label>
              <input type="number" required min="1" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" value={formData.lecture_duration_min} onChange={e => setFormData({...formData, lecture_duration_min: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Break (0 for none)</label>
              <input type="number" required min="0" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" value={formData.break_duration_min} onChange={e => setFormData({...formData, break_duration_min: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Start Time</label>
              <input type="time" required className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">End Time</label>
              <input type="time" required className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} />
            </div>
          </div>
          <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-indigo-700 hover:shadow-lg transition">
            {editId ? 'Update Class' : 'Create Class'}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map(c => (
          <div key={c.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col relative group">
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleEdit(c)} className="text-slate-400 hover:text-indigo-600" title="Edit Time Rules">
                <Edit2 size={18} />
              </button>
              <button onClick={() => handleDelete(c.id, c.name)} className="text-slate-400 hover:text-rose-600" title="Delete Class">
                <Trash2 size={18} />
              </button>
            </div>
            <h3 className="text-2xl font-extrabold text-slate-800 mb-2">{c.name}</h3>
            <div className="text-sm text-slate-500 space-y-1 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p className="flex items-center gap-2 font-medium"><Clock size={14} className="text-indigo-500"/> {c.start_time.substring(0,5)} to {c.end_time.substring(0,5)}</p>
              <p className="flex justify-between"><span>Lecture: <span className="font-semibold text-slate-700">{c.lecture_duration_min}m</span></span> <span>Break: <span className="font-semibold text-slate-700">{c.break_duration_min}m</span></span></p>
            </div>
            <div className="mt-auto space-y-3">
              <button onClick={() => navigate(`/class/${c.id}/setup`)} className="w-full bg-white border-2 border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg font-bold hover:bg-slate-50 hover:border-slate-300 transition">
                Setup Data
              </button>
              <button onClick={() => navigate(`/class/${c.id}/timetable`)} className="w-full bg-indigo-50 border-2 border-indigo-100 text-indigo-700 px-4 py-2.5 rounded-lg font-bold hover:bg-indigo-600 hover:text-white hover:border-indigo-600 flex items-center justify-center gap-2 transition-all">
                View Timetable <ArrowRight size={18}/>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
