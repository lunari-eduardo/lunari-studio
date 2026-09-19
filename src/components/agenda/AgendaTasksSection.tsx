import React, { useMemo } from 'react';
import { isSameDay, parseISO, getMonth, getYear, getDate, startOfWeek, endOfWeek, format } from 'date-fns';
import { Calendar, Circle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseTaskStatuses } from '@/hooks/useSupabaseTaskStatuses';
import type { Task } from '@/types/tasks';

interface AgendaTasksSectionProps {
  selectedDate: Date;
  tasks: Task[];
  viewMode: 'day' | 'week' | 'month' | 'year';
  onCreateTask: () => void;
  onDayClick?: (date: Date) => void;
}

export default function AgendaTasksSection({
  selectedDate,
  tasks,
  viewMode,
  onCreateTask,
  onDayClick
}: AgendaTasksSectionProps) {
  const navigate = useNavigate();
  const { isTerminalKey } = useSupabaseTaskStatuses();

  // Filter tasks for the selected date that are not completed (for day view)
  const dayTasks = useMemo(() => {
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      const taskDate = parseISO(task.dueDate);
      if (!isSameDay(taskDate, selectedDate)) return false;
      if (isTerminalKey(task.status) || task.completedAt) return false;
      return true;
    });
  }, [tasks, selectedDate, isTerminalKey]);

  // Filter tasks for the selected week that are not completed (week view)
  const weekTasks = useMemo(() => {
    if (viewMode !== 'week') return [];
    const weekStart = startOfWeek(selectedDate);
    const weekEnd = endOfWeek(selectedDate);
    return tasks
      .filter(task => {
        if (!task.dueDate) return false;
        if (isTerminalKey(task.status) || task.completedAt) return false;
        const taskDate = parseISO(task.dueDate);
        return taskDate >= weekStart && taskDate <= weekEnd;
      })
      .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));
  }, [tasks, selectedDate, viewMode, isTerminalKey]);
  
  // Group tasks by day for monthly view
  const monthlyTasksSummary = useMemo(() => {
    if (viewMode !== 'month') return [];
    
    const year = getYear(selectedDate);
    const month = getMonth(selectedDate);
    
    // Filter tasks for this month that are not completed
    const monthTasks = tasks.filter(task => {
      if (!task.dueDate) return false;
      if (isTerminalKey(task.status) || task.completedAt) return false;
      
      const taskDate = parseISO(task.dueDate);
      return getYear(taskDate) === year && getMonth(taskDate) === month;
    });
    
    // Group by day
    const tasksByDay = new Map<number, number>();
    monthTasks.forEach(task => {
      const day = getDate(parseISO(task.dueDate!));
      tasksByDay.set(day, (tasksByDay.get(day) || 0) + 1);
    });
    
    // Convert to sorted array
    return Array.from(tasksByDay.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([day, count]) => ({ day, count }));
  }, [tasks, selectedDate, viewMode, isTerminalKey]);
  
  // Limit to 5 tasks for daily/weekly view
  const visibleTasks = viewMode === 'week' ? weekTasks.slice(0, 6) : dayTasks.slice(0, 5);

  const handleTaskClick = (taskId: string) => {
    navigate(`/app/tarefas?taskId=${taskId}`);
  };

  const handleDayItemClick = (day: number) => {
    if (onDayClick) {
      const year = getYear(selectedDate);
      const month = getMonth(selectedDate);
      onDayClick(new Date(year, month, day));
    }
  };

  const getPriorityIndicator = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return <Circle className="h-2 w-2 fill-destructive text-destructive shrink-0" />;
      case 'medium':
        return <Circle className="h-2 w-2 fill-warning text-warning shrink-0" />;
      case 'low':
        return <Circle className="h-2 w-2 fill-success text-success shrink-0" />;
      default:
        return <Circle className="h-2 w-2 fill-muted text-muted shrink-0" />;
    }
  };
  
  // Dynamic title based on view mode
  const sectionTitle = viewMode === 'month'
    ? 'Tarefas do mês'
    : viewMode === 'week'
      ? 'Tarefas pendentes'
      : 'Tarefas do dia';
  
  // Hide in year view
  if (viewMode === 'year') {
    return null;
  }

  return (
    <div className="rounded-lg border border-border/20 bg-card/40 p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          {sectionTitle}
        </h3>
      </div>
      
      {/* Content based on view mode */}
      {viewMode === 'month' ? (
        // Monthly summary view
        <div className="space-y-1">
          {monthlyTasksSummary.length === 0 ? (
            <p className="py-2 text-center text-[11px] text-muted-foreground">
              Nenhuma tarefa pendente
            </p>
          ) : (
            <ul className="space-y-1">
              {monthlyTasksSummary.map(({ day, count }) => (
                <li
                  key={day}
                  className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/40 cursor-pointer transition-colors group"
                  onClick={() => handleDayItemClick(day)}
                >
                  <Calendar className="h-3 w-3 text-muted-foreground/60" />
                  <span className="flex-1 text-[11px] text-muted-foreground">
                    Dia {day}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">
                    {count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        // Daily/Weekly task list
        <>
          {visibleTasks.length === 0 ? (
            <p className="py-2 text-center text-[11px] text-muted-foreground">
              {viewMode === 'week' ? 'Nenhuma tarefa na semana' : 'Nenhuma tarefa'}
            </p>
          ) : (
            <ul className="space-y-1">
              {visibleTasks.map(task => (
                <li
                  key={task.id}
                  className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/40 cursor-pointer transition-colors"
                  onClick={() => handleTaskClick(task.id)}
                >
                  {getPriorityIndicator(task.priority)}
                  {viewMode === 'week' && task.dueDate && (
                    <span className="text-[10px] tabular-nums text-muted-foreground/60 shrink-0">
                      {format(parseISO(task.dueDate), 'dd/MM')}
                    </span>
                  )}
                  <span className="flex-1 truncate text-[11px] text-muted-foreground">
                    {task.title}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
