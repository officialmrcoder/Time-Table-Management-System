import React from 'react';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';

// A single cell that can receive items
function DroppableCell({ id, items, day, startTime, endTime }) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
    data: { day, start_time: startTime, end_time: endTime }
  });

  return (
    <td
      ref={setNodeRef}
      className={`border border-gray-200 p-2 h-28 min-w-[140px] align-top transition-all duration-200 ${
        isOver ? 'bg-blue-50 shadow-inner ring-2 ring-blue-300 ring-inset' : 'bg-white hover:bg-gray-50'
      }`}
    >
      <div className="flex flex-col gap-2 h-full">
        {items.map(item => (
          <DraggableItem key={item.id} id={item.id} item={item} />
        ))}
      </div>
    </td>
  );
}

// An item inside a cell
function DraggableItem({ id, item }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 50,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-blue-600 text-white p-3 rounded-lg shadow-sm cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-90 shadow-lg scale-105 ring-2 ring-blue-400' : 'hover:bg-blue-700 hover:shadow-md'
      }`}
    >
      <div className="font-bold text-sm tracking-wide">{item.subject_name}</div>
      <div className="text-xs text-blue-100 mt-1 flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        {item.teacher_name}
      </div>
    </div>
  );
}

export default function TimetableGrid({ entries, onMoveEntry }) {
  // Extract unique days and time slots
  const days = [...new Set(entries.map(e => e.day))];
  
  // Sort times correctly
  const timeSlots = [];
  const timeMap = new Map();
  entries.forEach(e => {
    const key = `${e.start_time}-${e.end_time}`;
    if (!timeMap.has(key)) {
      timeMap.set(key, { start: e.start_time, end: e.end_time });
      timeSlots.push({ start: e.start_time, end: e.end_time });
    }
  });
  
  timeSlots.sort((a, b) => a.start.localeCompare(b.start));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const entryId = active.id;
      const { day, start_time, end_time } = over.data.current;
      onMoveEntry(entryId, day, start_time, end_time);
    }
  };

  if (entries.length === 0) return <p className="text-gray-500 italic p-4 bg-gray-50 rounded-lg border border-gray-200">No timetable generated yet. Click "Generate New" above.</p>;

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="overflow-x-auto bg-white shadow-xl rounded-xl border border-gray-200 p-1">
        <table className="w-full text-center border-collapse">
          <thead>
            <tr>
              <th className="border-b-2 border-r-2 border-gray-200 p-4 bg-gray-100 text-gray-700 font-bold w-32 rounded-tl-lg">
                Time / Day
              </th>
              {days.map((day, idx) => (
                <th key={day} className={`border-b-2 border-gray-200 p-4 bg-gray-100 text-gray-700 font-bold uppercase tracking-wider ${idx === days.length - 1 ? 'rounded-tr-lg' : 'border-r-2'}`}>
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot, i) => (
              <tr key={i} className="group">
                <td className="border-r-2 border-b-2 border-gray-200 p-3 text-sm font-semibold text-gray-600 bg-gray-50 whitespace-nowrap">
                  <div className="flex flex-col items-center">
                    <span className="text-gray-800">{slot.start.substring(0,5)}</span>
                    <span className="text-gray-400 text-xs">to</span>
                    <span className="text-gray-800">{slot.end.substring(0,5)}</span>
                  </div>
                </td>
                {days.map((day, idx) => {
                  const cellId = `${day}-${slot.start}`;
                  const cellItems = entries.filter(e => e.day === day && e.start_time === slot.start);
                  return (
                    <DroppableCell 
                      key={cellId} 
                      id={cellId} 
                      day={day}
                      startTime={slot.start}
                      endTime={slot.end}
                      items={cellItems} 
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DndContext>
  );
}
