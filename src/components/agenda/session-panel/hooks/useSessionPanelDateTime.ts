import { useState, useCallback } from "react";
import { formatDateForInput, safeParseInputDate } from "@/utils/dateUtils";
import { PanelFormState } from "../types";

export function useSessionPanelDateTime(
  initialDate: Date,
  initialTime: string,
  setForm: React.Dispatch<React.SetStateAction<PanelFormState>>
) {
  const [dateInput, setDateInput] = useState(() => formatDateForInput(initialDate));
  const [timeInput, setTimeInput] = useState(initialTime);

  const handleDateInputChange = useCallback((val: string) => {
    setDateInput(val);
    const parsed = safeParseInputDate(val);
    if (parsed) {
      setForm((prev) => ({ ...prev, date: parsed }));
    }
  }, [setForm]);

  const handleTimeInputChange = useCallback((val: string) => {
    setTimeInput(val);
    if (val && val.length === 5) {
      setForm((prev) => ({ ...prev, time: val }));
    }
  }, [setForm]);

  const commitDate = useCallback(() => {
    const parsed = safeParseInputDate(dateInput);
    if (parsed) {
      setForm((prev) => ({ ...prev, date: parsed }));
    } else {
      setForm((prev) => {
        setDateInput(formatDateForInput(prev.date));
        return prev;
      });
    }
  }, [dateInput, setForm]);

  const commitTime = useCallback(() => {
    if (!timeInput) {
      setForm((prev) => {
        setTimeInput(prev.time);
        return prev;
      });
      return;
    }
    setForm((prev) => ({ ...prev, time: timeInput }));
  }, [timeInput, setForm]);

  const syncInputs = useCallback((date: Date, time: string) => {
    setDateInput(formatDateForInput(date));
    setTimeInput(time);
  }, []);

  return {
    dateInput,
    setDateInput: handleDateInputChange,
    timeInput,
    setTimeInput: handleTimeInputChange,
    commitDate,
    commitTime,
    syncInputs,
  };
}
