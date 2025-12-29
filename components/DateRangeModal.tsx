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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <CalendarIcon size={18} className="text-blue-600" />
            Select Date Range
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 flex flex-col items-center">
            {/* Custom Styles for DatePicker to make it look cleaner */}
            <style>{`
              .react-datepicker {
                font-family: inherit;
                border: none;
                box-shadow: none;
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
            
            <div className="mt-4 bg-blue-50 p-3 rounded-xl text-blue-800 text-xs font-medium flex items-center gap-2 w-full justify-center">
                <span>Selected:</span>
                <span className="font-bold">
                {startDate ? startDate.toLocaleDateString() : 'Start'} - {endDate ? endDate.toLocaleDateString() : 'End'}
                </span>
            </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex gap-3 justify-end bg-slate-50/30">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-lg transition-colors"
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
                ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' 
                : 'bg-slate-300 cursor-not-allowed shadow-none'
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
