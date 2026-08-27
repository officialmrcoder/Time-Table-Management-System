import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ClassSetup from './pages/ClassSetup';
import Timetable from './pages/Timetable';
import { Calendar } from 'lucide-react';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
        {/* Professional Header */}
        <header className="bg-slate-900 text-white p-4 shadow-lg border-b border-slate-700 no-print">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-500 p-2 rounded-lg shadow-inner">
                <Calendar size={24} className="text-white" />
              </div>
              <Link to="/" className="text-xl sm:text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-white hover:opacity-90 transition">
                Time Table Management System
              </Link>
            </div>
            <div className="text-sm font-semibold text-slate-300 tracking-wider uppercase hidden sm:block">
              All Ended Solutions PVT LTD.
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-grow max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/class/:classId/setup" element={<ClassSetup />} />
            <Route path="/class/:classId/timetable" element={<Timetable />} />
          </Routes>
        </main>

        {/* Professional Footer */}
        <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800 mt-auto no-print">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between text-sm">
            <p>&copy; {new Date().getFullYear()} <span className="text-white font-semibold">Developed by All Ended Solutions</span></p>
            <p className="mt-2 sm:mt-0">Contact: <a href="mailto:allendedsolutions@gmail.com" className="text-indigo-400 hover:text-indigo-300 transition">allendedsolutions@gmail.com</a></p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
