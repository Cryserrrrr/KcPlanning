import { useState, useRef, useEffect } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isAfter,
  isBefore,
} from "date-fns";

interface CalendarProps {
  onSelectDate: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  currentDate?: Date;
  onClose?: () => void;
}

export function Calendar({
  onSelectDate,
  minDate,
  maxDate,
  currentDate = new Date(),
  onClose,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(currentDate));
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node) &&
        onClose
      ) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={prevMonth}
          className="p-2 rounded hover:bg-gray-700"
          disabled={minDate && isBefore(startOfMonth(currentMonth), minDate)}
        >
          &lt;
        </button>
        <div className="text-lg font-bold">
          {format(currentMonth, "MMMM yyyy")}
        </div>
        <button
          onClick={nextMonth}
          className="p-2 rounded hover:bg-gray-700"
          disabled={maxDate && isAfter(endOfMonth(currentMonth), maxDate)}
        >
          &gt;
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return (
      <div className="grid grid-cols-7 gap-1 mb-2">
        {days.map((day) => (
          <div key={day} className="text-center text-gray-400 text-sm">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const isDisabled =
          (minDate && isBefore(cloneDay, minDate)) ||
          (maxDate && isAfter(cloneDay, maxDate));

        days.push(
          <div
            key={day.toString()}
            className={`p-2 text-center cursor-pointer rounded hover:bg-primary hover:bg-opacity-30 ${
              !isSameMonth(day, monthStart) ? "text-gray-600" : ""
            } ${isSameDay(day, currentDate) ? "bg-primary text-white" : ""} ${
              isDisabled ? "opacity-30 cursor-not-allowed" : ""
            }`}
            onClick={() => !isDisabled && onSelectDate(cloneDay)}
          >
            {format(day, "d")}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7 gap-1 mb-1">
          {days}
        </div>
      );
      days = [];
    }

    return <div className="mt-2">{rows}</div>;
  };

  return (
    <div className="calendar" ref={calendarRef}>
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
}
