import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Task = {
  id: string;
  type: string;
  status: string;
  application_id: string;
  due_at: string;
  title?: string;
};

// Type badge colors
const typeColors: Record<string, { bg: string; text: string }> = {
  call: { bg: "#dbeafe", text: "#1d4ed8" },
  email: { bg: "#fef3c7", text: "#b45309" },
  review: { bg: "#f3e8ff", text: "#7c3aed" },
};

// Status badge colors
const statusColors: Record<string, { bg: string; text: string }> = {
  open: { bg: "#fee2e2", text: "#dc2626" },
  in_progress: { bg: "#fef3c7", text: "#d97706" },
  completed: { bg: "#dcfce7", text: "#16a34a" },
};

// Calendar Component
function Calendar({
  selectedDate,
  onSelectDate,
  taskDates,
}: {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  taskDates: Set<string>;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    return (
      day === selectedDate.getDate() &&
      currentMonth.getMonth() === selectedDate.getMonth() &&
      currentMonth.getFullYear() === selectedDate.getFullYear()
    );
  };

  const hasTask = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return taskDates.has(dateStr);
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    onSelectDate(newDate);
  };

  const days = [];
  // Empty cells for days before the first day of month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} style={calStyles.emptyDay}></div>);
  }
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayHasTask = hasTask(day);
    const dayIsToday = isToday(day);
    const dayIsSelected = isSelected(day);

    days.push(
      <div
        key={day}
        onClick={() => handleDateClick(day)}
        style={{
          ...calStyles.day,
          ...(dayIsToday ? calStyles.today : {}),
          ...(dayIsSelected ? calStyles.selected : {}),
          cursor: "pointer",
        }}
      >
        <span>{day}</span>
        {dayHasTask && <div style={calStyles.taskDot}></div>}
      </div>
    );
  }

  return (
    <div style={calStyles.calendar}>
      <div style={calStyles.calHeader}>
        <button onClick={prevMonth} style={calStyles.navBtn}>←</button>
        <span style={calStyles.monthYear}>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </span>
        <button onClick={nextMonth} style={calStyles.navBtn}>→</button>
      </div>
      <div style={calStyles.dayNames}>
        {dayNames.map((name) => (
          <div key={name} style={calStyles.dayName}>{name}</div>
        ))}
      </div>
      <div style={calStyles.daysGrid}>{days}</div>
      <div style={calStyles.legend}>
        <div style={calStyles.legendItem}>
          <div style={{ ...calStyles.taskDot, position: "static", marginRight: "6px" }}></div>
          <span>Has tasks</span>
        </div>
      </div>
    </div>
  );
}

export default function TodayDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [taskDates, setTaskDates] = useState<Set<string>>(new Set());

  // Fetch all tasks to get dates with tasks
  async function fetchAllTaskDates() {
    try {
      const { data, error: queryError } = await supabase
        .from("tasks")
        .select("due_at")
        .neq("status", "completed");

      if (queryError) throw queryError;

      const dates = new Set<string>();
      (data || []).forEach((task) => {
        const date = new Date(task.due_at);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        dates.add(dateStr);
      });
      setTaskDates(dates);
    } catch (err) {
      console.error("Failed to fetch task dates:", err);
    }
  }

  async function fetchTasks(date: Date = selectedDate) {
    setLoading(true);
    setError(null);

    try {
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).toISOString();

      const { data, error: queryError } = await supabase
        .from("tasks")
        .select("id, type, status, application_id, due_at, title")
        .gte("due_at", startOfDay)
        .lt("due_at", endOfDay)
        .neq("status", "completed")
        .order("due_at", { ascending: true });

      if (queryError) throw queryError;

      setTasks(data || []);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  async function markComplete(id: string) {
    setCompleting(id);
    try {
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", id);

      if (updateError) throw updateError;

      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
      // Refresh task dates after completing
      fetchAllTaskDates();
    } catch (err: any) {
      console.error(err);
      alert("Failed to update task");
    } finally {
      setCompleting(null);
    }
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    fetchTasks(date);
  };

  useEffect(() => {
    fetchTasks();
    fetchAllTaskDates();
  }, []);

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const formatSelectedDate = (date: Date) => {
    if (isToday(date)) {
      return "Today's Tasks";
    }
    return `Tasks for ${date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })}`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.mainLayout}>
        {/* Left: Task List */}
        <div style={styles.taskSection}>
          {/* Header */}
          <header style={styles.header}>
            <div>
              <h1 style={styles.title}>{formatSelectedDate(selectedDate)}</h1>
              <p style={styles.subtitle}>
                {selectedDate.toLocaleDateString("en-US", { 
                  weekday: "long", 
                  year: "numeric", 
                  month: "long", 
                  day: "numeric" 
                })}
              </p>
            </div>
            <button onClick={() => fetchTasks(selectedDate)} style={styles.refreshBtn} disabled={loading}>
              {loading ? "Refreshing..." : "↻ Refresh"}
            </button>
          </header>

          {/* Loading State */}
          {loading && (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p>Loading tasks...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div style={styles.errorContainer}>
              <p>⚠️ {error}</p>
              <button onClick={() => fetchTasks(selectedDate)} style={styles.retryBtn}>Try Again</button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && tasks.length === 0 && (
            <div style={styles.emptyContainer}>
              <div style={styles.emptyIcon}>🎉</div>
              <h2 style={styles.emptyTitle}>All caught up!</h2>
              <p style={styles.emptyText}>
                No tasks due {isToday(selectedDate) ? "today" : "on this day"}. 
                {isToday(selectedDate) ? " Enjoy your day!" : ""}
              </p>
            </div>
          )}

          {/* Task Cards */}
          {!loading && !error && tasks.length > 0 && (
            <div style={styles.statsBar}>
              <span style={styles.statItem}>
                <strong>{tasks.length}</strong> task{tasks.length !== 1 ? "s" : ""} remaining
              </span>
            </div>
          )}

          <div style={styles.taskList}>
            {tasks.map((task) => (
              <div key={task.id} style={styles.taskCard}>
                <div style={styles.taskHeader}>
                  <span
                    style={{
                      ...styles.badge,
                      backgroundColor: typeColors[task.type]?.bg || "#e5e7eb",
                      color: typeColors[task.type]?.text || "#374151",
                    }}
                  >
                    {task.type === "call" && "📞 "}
                    {task.type === "email" && "✉️ "}
                    {task.type === "review" && "📋 "}
                    {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
                  </span>
                  <span
                    style={{
                      ...styles.badge,
                      backgroundColor: statusColors[task.status]?.bg || "#e5e7eb",
                      color: statusColors[task.status]?.text || "#374151",
                    }}
                  >
                    {task.status.replace("_", " ")}
                  </span>
                </div>

                {task.title && <h3 style={styles.taskTitle}>{task.title}</h3>}

                <div style={styles.taskDetails}>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>🕐 Due:</span>
                    <span style={styles.detailValue}>{formatTime(task.due_at)}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>📄 Application:</span>
                    <span style={styles.detailValueMono}>{task.application_id.slice(0, 8)}...</span>
                  </div>
                </div>

                <button
                  onClick={() => markComplete(task.id)}
                  disabled={completing === task.id}
                  style={{
                    ...styles.completeBtn,
                    opacity: completing === task.id ? 0.6 : 1,
                    cursor: completing === task.id ? "not-allowed" : "pointer",
                  }}
                >
                  {completing === task.id ? "Completing..." : "✓ Mark Complete"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Calendar */}
        <div style={styles.calendarSection}>
          <Calendar
            selectedDate={selectedDate}
            onSelectDate={handleDateSelect}
            taskDates={taskDates}
          />
        </div>
      </div>
    </div>
  );
}

// Calendar styles
const calStyles: Record<string, React.CSSProperties> = {
  calendar: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "1.25rem",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    border: "1px solid #e2e8f0",
    position: "sticky",
    top: "2rem",
  },
  calHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  },
  navBtn: {
    background: "none",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    padding: "0.4rem 0.8rem",
    cursor: "pointer",
    fontSize: "1rem",
    color: "#475569",
  },
  monthYear: {
    fontWeight: 600,
    fontSize: "1rem",
    color: "#1e293b",
  },
  dayNames: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "2px",
    marginBottom: "0.5rem",
  },
  dayName: {
    textAlign: "center",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#64748b",
    padding: "0.25rem",
  },
  daysGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "2px",
  },
  day: {
    position: "relative",
    textAlign: "center",
    padding: "0.5rem",
    borderRadius: "6px",
    fontSize: "0.9rem",
    color: "#1e293b",
    transition: "all 0.15s",
  },
  emptyDay: {
    padding: "0.5rem",
  },
  today: {
    backgroundColor: "#dbeafe",
    fontWeight: 600,
  },
  selected: {
    backgroundColor: "#3b82f6",
    color: "#fff",
    fontWeight: 600,
  },
  taskDot: {
    position: "absolute",
    bottom: "3px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: "#10b981",
  },
  legend: {
    marginTop: "1rem",
    paddingTop: "0.75rem",
    borderTop: "1px solid #e2e8f0",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    fontSize: "0.8rem",
    color: "#64748b",
  },
};

// Inline styles for better presentation
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
    padding: "2rem",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  mainLayout: {
    display: "flex",
    gap: "2rem",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  taskSection: {
    flex: 1,
    minWidth: 0,
  },
  calendarSection: {
    width: "320px",
    flexShrink: 0,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2rem",
  },
  title: {
    fontSize: "2rem",
    fontWeight: 700,
    color: "#1e293b",
    margin: 0,
  },
  subtitle: {
    fontSize: "0.95rem",
    color: "#64748b",
    margin: "0.25rem 0 0",
  },
  refreshBtn: {
    padding: "0.5rem 1rem",
    backgroundColor: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.9rem",
    color: "#475569",
    transition: "all 0.2s",
  },
  loadingContainer: {
    textAlign: "center",
    padding: "4rem",
    color: "#64748b",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid #e2e8f0",
    borderTopColor: "#3b82f6",
    borderRadius: "50%",
    margin: "0 auto 1rem",
    animation: "spin 1s linear infinite",
  },
  errorContainer: {
    textAlign: "center",
    padding: "2rem",
    backgroundColor: "#fef2f2",
    borderRadius: "12px",
    color: "#dc2626",
    maxWidth: "500px",
    margin: "0 auto",
  },
  retryBtn: {
    marginTop: "1rem",
    padding: "0.5rem 1.5rem",
    backgroundColor: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  emptyContainer: {
    textAlign: "center",
    padding: "4rem 2rem",
  },
  emptyIcon: {
    fontSize: "4rem",
    marginBottom: "1rem",
  },
  emptyTitle: {
    fontSize: "1.5rem",
    color: "#1e293b",
    margin: "0 0 0.5rem",
  },
  emptyText: {
    color: "#64748b",
    margin: 0,
  },
  statsBar: {
    marginBottom: "1rem",
    padding: "0.75rem 1rem",
    backgroundColor: "#fff",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  statItem: {
    color: "#475569",
    fontSize: "0.9rem",
  },
  taskList: {
    display: "grid",
    gap: "1rem",
  },
  taskCard: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "1.25rem",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    border: "1px solid #e2e8f0",
    transition: "box-shadow 0.2s",
  },
  taskHeader: {
    display: "flex",
    gap: "0.5rem",
    marginBottom: "0.75rem",
  },
  badge: {
    padding: "0.25rem 0.75rem",
    borderRadius: "20px",
    fontSize: "0.8rem",
    fontWeight: 500,
  },
  taskTitle: {
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "#1e293b",
    margin: "0 0 0.75rem",
  },
  taskDetails: {
    display: "flex",
    flexWrap: "wrap",
    gap: "1rem",
    marginBottom: "1rem",
  },
  detailRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  detailLabel: {
    color: "#64748b",
    fontSize: "0.85rem",
  },
  detailValue: {
    color: "#1e293b",
    fontSize: "0.9rem",
    fontWeight: 500,
  },
  detailValueMono: {
    color: "#1e293b",
    fontSize: "0.85rem",
    fontFamily: "monospace",
    backgroundColor: "#f1f5f9",
    padding: "0.2rem 0.5rem",
    borderRadius: "4px",
  },
  completeBtn: {
    width: "100%",
    padding: "0.75rem",
    backgroundColor: "#10b981",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "0.95rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
};
