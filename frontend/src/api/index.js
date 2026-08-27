import axios from 'axios';

const API_BASE_URL = 'https://time-table-management-system-lrpq.onrender.com';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

export const getClasses = () => api.get('/classes');
export const createClass = (data) => api.post('/classes', data);
export const updateClass = (id, data) => api.put(`/classes/${id}`, data);
export const deleteClass = (id) => api.delete(`/classes/${id}`);

export const getSections = (classId) => api.get(`/sections/${classId}`);
export const createSection = (data) => api.post('/sections', data);
export const updateSection = (id, data) => api.put(`/sections/${id}`, data);
export const deleteSection = (id) => api.delete(`/sections/${id}`);

export const getSubjects = (classId) => api.get(`/subjects/${classId}`);
export const createSubject = (data) => api.post('/subjects', data);
export const updateSubject = (id, data) => api.put(`/subjects/${id}`, data);
export const deleteSubject = (id) => api.delete(`/subjects/${id}`);

export const getTeachers = (classId) => api.get(`/teachers/${classId}`);
export const createTeacher = (data) => api.post('/teachers', data);
export const updateTeacher = (id, data) => api.put(`/teachers/${id}`, data);
export const deleteTeacher = (id) => api.delete(`/teachers/${id}`);

export const getTimetable = (classId) => api.get(`/timetable/${classId}`);
export const generateTimetable = (classId) => api.post(`/generate-timetable/${classId}`);
export const createEntry = (data) => api.post('/timetable/entry', data);
export const updateEntry = (entryId, data) => api.put(`/timetable/entry/${entryId}`, data);
export const moveEntry = (entryId, data) => api.put(`/timetable/entry/${entryId}`, data);
export const clearTimetable = (classId) => api.delete(`/timetable/${classId}`);
export const proxyTeacher = (entryId, newTeacherId) => api.post('/proxy', { entry_id: entryId, new_teacher_id: newTeacherId });
export const moveBreak = (classId, direction) => api.post(`/timetable/${classId}/move_break`, { direction });
export const pinLecture = (data) => api.post('/timetable/pin', data);
export const unpinLecture = (entryId) => api.post(`/timetable/unpin/${entryId}`);
export const getTimeSlots = (classId) => api.get(`/timetable/${classId}/slots`);
