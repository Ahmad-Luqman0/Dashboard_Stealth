import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { X, Calendar as CalendarIcon } from 'lucide-react';

interface DateRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (start: Date, end: Date) => void;
}

const DateRangeModal: React.FC<DateRangeModalProps> = ({ isOpen, onClose, onApply }) => {
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);

  const onChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <CalendarIcon size={18} className="text-blue-600 dark:text-blue-400" />
            Select Date Range
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 dark:text-slate-500">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 flex flex-col items-center dark:bg-slate-800">
            {/* Custom Styles for DatePicker to make it look cleaner */}
            <style>{`
              .react-datepicker {
                font-family: inherit;
                border: none;
                box-shadow: none;
                background-color: transparent;
              }
              .react-datepicker__header {
                background-color: white;
                border-bottom: none;
              }
              .react-datepicker__day--selected, .react-datepicker__day--in-selecting-range, .react-datepicker__day--in-range {
                background-color: #2563eb !important;
                color: white !important;
              }
              .react-datepicker__day--keyboard-selected {
                background-color: #eff6ff;
                color: #2563eb;
              }
              
              /* Dark mode overrides */
              .dark .react-datepicker {
                background-color: transparent;
              }
              .dark .react-datepicker__header {
                background-color: #1e293b;
                border-bottom: 1px solid #334155;
              }
              .dark .react-datepicker__current-month,
              .dark .react-datepicker__day-name {
                color: #e5e7eb !important;
              }
              .dark .react-datepicker__day {
                color: #d1d5db !important;
              }
              .dark .react-datepicker__day:hover {
                background-color: rgba(59, 130, 246, 0.2) !important;
              }
              .dark .react-datepicker__day--disabled {
                color: #4b5563 !important;
              }
              .dark .react-datepicker__day--keyboard-selected {
                background-color: rgba(59, 130, 246, 0.3);
                color: #93c5fd;
              }
            `}</style>
            <DatePicker
              selected={startDate}
              onChange={onChange}
              startDate={startDate}
              endDate={endDate}
              selectsRange
              inline
              monthsShown={1}
            />
            
            <div className="mt-4 bg-blue-50 dark:bg-blue-950/50 p-3 rounded-xl text-blue-800 dark:text-blue-300 text-xs font-medium flex items-center gap-2 w-full justify-center border border-blue-100 dark:border-blue-900">
                <span>Selected:</span>
                <span className="font-bold">
                {startDate ? startDate.toLocaleDateString() : 'Start'} - {endDate ? endDate.toLocaleDateString() : 'End'}
                </span>
            </div>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex gap-3 justify-end bg-slate-50/30 dark:bg-slate-800/50">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              if (startDate && endDate) {
                onApply(startDate, endDate);
                onClose();
              }
            }}
            disabled={!startDate || !endDate}
            className={`px-6 py-2 text-white font-bold text-sm rounded-lg shadow-lg transition-all active:scale-95 ${
                startDate && endDate 
                ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-blue-900/50' 
                : 'bg-slate-300 dark:bg-slate-600 cursor-not-allowed shadow-none'
            }`}
          >
            Apply Range
          </button>
        </div>
      </div>
    </div>
  );
};

export default DateRangeModal;
