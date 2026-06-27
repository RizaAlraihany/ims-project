import { DayPicker } from "react-day-picker"
import { cn } from "@/utils/cn"
import "react-day-picker/style.css"

export function Calendar({ className, showOutsideDays = false, ...props }) {
  return (
    <div className={cn("bg-white calendar-wrapper", className)}>
      <DayPicker
        showOutsideDays={showOutsideDays}
        {...props}
      />
      <style>{`
        .calendar-wrapper {
          --rdp-accent-color: #4B5694;
          --rdp-background-color: rgba(75, 86, 148, 0.1);
          --rdp-day-height: 40px;
          --rdp-day-width: 40px;
          --rdp-selected-font: 600;
        }

        .calendar-wrapper .rdp-months {
          display: flex !important;
          flex-direction: row !important;
          flex-wrap: nowrap !important;
          gap: 1.5rem;
        }

        /* Pill shape for ranges */
        .calendar-wrapper .rdp-day {
          border-radius: 50%;
        }
        
        .calendar-wrapper .rdp-range_middle {
          background-color: rgba(75, 86, 148, 0.1) !important;
          color: #111844 !important;
          border-radius: 0 !important;
        }
        
        .calendar-wrapper .rdp-range_start {
          background-color: #4B5694 !important;
          color: white !important;
          border-top-left-radius: 50% !important;
          border-bottom-left-radius: 50% !important;
          border-top-right-radius: 0 !important;
          border-bottom-right-radius: 0 !important;
        }
        
        .calendar-wrapper .rdp-range_end {
          background-color: #4B5694 !important;
          color: white !important;
          border-top-right-radius: 50% !important;
          border-bottom-right-radius: 50% !important;
          border-top-left-radius: 0 !important;
          border-bottom-left-radius: 0 !important;
        }
        
        .calendar-wrapper .rdp-range_start.rdp-range_end {
          border-radius: 50% !important;
        }
        
        /* Make caption bolder */
        .calendar-wrapper .rdp-caption_label {
          font-weight: 600;
          color: #111844;
        }
        
        .calendar-wrapper .rdp-head_cell {
          color: #7288AE;
          font-weight: 500;
          font-size: 13px;
        }
      `}</style>
    </div>
  )
}
