import { useCallback, useEffect, useState } from "react";

const API = "http://localhost:5000";

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${sessionStorage.getItem("token")}`,
  };
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function Icon({ name, className = "w-4 h-4" }) {
  const paths = {
    menu: "M4 6h16M4 12h16M4 18h16",
    logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
    sun: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z",
    moon: "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z",
    search: "M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z",
    plus: "M12 4v16m8-8H4",
  };
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={paths[name]} />
    </svg>
  );
}

function Alert({ msg, onClose }) {
  if (!msg) return null;
  const ok = msg.type === "success";
  return (
    <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl mb-4"
      style={ok
        ? { background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.28)" }
        : { background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.28)" }}>
      <p className={`text-sm font-medium ${ok ? "text-green-500" : "text-red-500"}`}>{msg.text}</p>
      {onClose && <button onClick={onClose} className="text-xs font-bold opacity-70 hover:opacity-100">X</button>}
    </div>
  );
}

function Badge({ children, tone = "neutral" }) {
  const styles = {
    good: { background: "rgba(34,197,94,0.15)", color: "#16a34a", border: "1px solid rgba(34,197,94,0.32)" },
    warn: { background: "rgba(249,115,22,0.15)", color: "#ea580c", border: "1px solid rgba(249,115,22,0.32)" },
    danger: { background: "rgba(239,68,68,0.15)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.32)" },
    neutral: { background: "rgba(99,102,241,0.15)", color: "#4f46e5", border: "1px solid rgba(99,102,241,0.32)" },
  };
  return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={styles[tone]}>{children}</span>;
}

function Field({ label, children, t }) {
  return (
    <div>
      <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${t.label}`}>{label}</label>
      {children}
    </div>
  );
}

function useTeacherData() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [classesRes, studentsRes, subjectsRes, overviewRes] = await Promise.all([
        fetch(`${API}/teachers/classes`, { headers: authHeaders() }),
        fetch(`${API}/teachers/students`, { headers: authHeaders() }),
        fetch(`${API}/teachers/subjects`, { headers: authHeaders() }),
        fetch(`${API}/teachers/overview`, { headers: authHeaders() }),
      ]);
      const [classesData, studentsData, subjectsData, overviewData] = await Promise.all([
        classesRes.json(), studentsRes.json(), subjectsRes.json(), overviewRes.json(),
      ]);
      if (classesData.success) setClasses(classesData.classes);
      if (studentsData.success) setStudents(studentsData.students);
      if (subjectsData.success) setSubjects(subjectsData.subjects);
      if (overviewData.success) setStats(overviewData.stats);
    } catch {
      setMsg({ type: "error", text: "Failed to load teacher data." });
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  return { classes, students, subjects, stats, loading, msg, setMsg, reload: load };
}

// ─── Timetable helpers (shared) ───────────────────────────────────────────────
const TIMETABLE_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday'];

function buildTimetableGrid(slots) {
  const times = [...new Set(slots.map(s => s.start_time))].sort();
  const map = {};
  slots.forEach(s => {
    if (!map[s.day]) map[s.day] = {};
    map[s.day][s.start_time] = s;
  });
  return { times, map };
}

function TimetableGrid({ slots, t, showClass = false }) {
  if (!slots.length) return (
    <p className={`text-center py-10 text-sm ${t.subheading}`}>No schedule assigned yet.</p>
  );
  const { times, map } = buildTimetableGrid(slots);
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm min-w-[680px]">
        <thead>
          <tr style={{ background: t.tableHeadBg }}>
            <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${t.subheading}`}>Time</th>
            {TIMETABLE_DAYS.map(d => (
              <th key={d} className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${t.subheading}`}>{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times.map((time, i) => (
            <tr key={time} style={{ background: i % 2 === 0 ? t.tableRowEven : t.tableRowOdd, borderTop: `1px solid ${t.cardBorder}` }}>
              <td className={`px-4 py-3 font-bold text-xs ${t.label}`}>{time}</td>
              {TIMETABLE_DAYS.map(day => {
                const slot = map[day]?.[time];
                return (
                  <td key={day} className="px-4 py-3">
                    {slot ? (
                      <div className="rounded-xl p-2.5"
                        style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
                        <p className={`font-bold text-xs ${t.heading}`}>{slot.subject?.name}</p>
                        {showClass && slot.class && (
                          <p className={`text-xs mt-0.5 ${t.subheading}`}>G{slot.class.grade_level}-{slot.class.section}</p>
                        )}
                        <p className={`text-xs mt-0.5 ${t.subheading}`}>{slot.start_time}–{slot.end_time}</p>
                      </div>
                    ) : (
                      <span className={`text-xs ${t.subheading} opacity-30`}>—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScheduleView({ t }) {
  const [slots, setSlots]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5000/timetable", {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionStorage.getItem("token")}` },
    })
      .then(r => r.json())
      .then(d => { if (d.success) setSlots(d.slots); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className={`text-xl font-bold mb-1 ${t.heading}`}>My Schedule</h2>
      <p className={`text-sm mb-6 ${t.subheading}`}>Your weekly teaching timetable across all assigned classes.</p>
      <div className="rounded-2xl overflow-hidden" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <TimetableGrid slots={slots} t={t} showClass={true} />
        )}
      </div>
    </div>
  );
}

function DashboardView({ t, data, onNavigate }) {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const cards = [
    ["Classes", data.stats.classes || 0, "#4f46e5", "classes"],
    ["Subjects", data.stats.subjects || 0, "#0891b2", "classes"],
    ["Students", data.stats.students || 0, "#16a34a", "students"],
    ["Grades", data.stats.grades || 0, "#ea580c", "grades"],
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className={`text-2xl font-bold mb-1 ${t.heading}`}>Welcome, {user.name || "Teacher"}</h2>
        <p className={`text-sm ${t.subheading}`}>Manage your classes, students, grades, attendance, and announcements.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {cards.map(([label, value, color, nav]) => (
          <button key={label} onClick={() => onNavigate(nav)} className="rounded-2xl p-5 text-left transition-all hover:scale-[1.01]"
            style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
            <p className="text-3xl font-bold mb-2" style={{ color }}>{value}</p>
            <p className={`text-sm font-semibold ${t.heading}`}>{label}</p>
            <p className={`text-xs mt-1 ${t.subheading}`}>Open section</p>
          </button>
        ))}
      </div>
      <div className="rounded-2xl p-5" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
        <p className={`text-sm font-semibold mb-3 ${t.heading}`}>Today workflow</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            ["1", "Check classes", "Review your current classes and subjects."],
            ["2", "Record grades", "Add exam or quiz marks for students."],
            ["3", "Notify families", "Send announcements to students and parents."],
          ].map(([step, title, body]) => (
            <div key={step} className="rounded-xl p-4" style={{ background: t.listItemBg, border: `1px solid ${t.listItemBorder}` }}>
              <span className="inline-flex w-7 h-7 rounded-lg items-center justify-center text-xs font-bold text-white mb-3"
                style={{ background: "linear-gradient(135deg,#0891b2,#6366f1)" }}>{step}</span>
              <p className={`text-sm font-semibold ${t.heading}`}>{title}</p>
              <p className={`text-xs mt-1 ${t.subheading}`}>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ClassesView({ t, data }) {
  return (
    <div>
      <h2 className={`text-2xl font-bold mb-1 ${t.heading}`}>My Classes</h2>
      <p className={`text-sm mb-6 ${t.subheading}`}>Current classes and subjects assigned to you.</p>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {data.classes.length === 0 ? (
          <div className={`text-center py-16 rounded-2xl ${t.subheading}`} style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>No classes assigned yet.</div>
        ) : data.classes.map(cls => (
          <div key={cls.id} className="rounded-2xl p-5" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className={`text-lg font-bold ${t.heading}`}>{cls.name}</h3>
                <p className={`text-sm ${t.subheading}`}>{cls.student_count || 0} students</p>
              </div>
              <Badge tone="neutral">{cls.subjects?.length || 0} subjects</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {(cls.subjects || []).map(subject => <Badge key={subject.id} tone="good">{subject.name}</Badge>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentsView({ t, data }) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const filtered = data.students.filter(s =>
    !query ||
    s.profile?.name?.toLowerCase().includes(query) ||
    s.profile?.email?.toLowerCase().includes(query) ||
    s.parent?.name?.toLowerCase().includes(query) ||
    s.class?.name?.toLowerCase().includes(query)
  );

  return (
    <div>
      <h2 className={`text-2xl font-bold mb-1 ${t.heading}`}>Students and Parents</h2>
      <p className={`text-sm mb-5 ${t.subheading}`}>All students in your assigned classes with parent contact information.</p>
      <div className="relative mb-4">
        <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student, parent, or class"
          className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none ${t.inputText} ${t.inputPlaceholder}`}
          style={{ background: t.fieldBg, color: t.fieldText, border: `1px solid ${t.fieldBorder}` }} />
      </div>
      <Table t={t} headers={["Student", "Email", "Class", "Parent", "Parent Email"]}>
        {filtered.map((s, i) => (
          <tr key={s.user_id} style={{ background: i % 2 === 0 ? t.tableRowEven : t.tableRowOdd, borderTop: `1px solid ${t.cardBorder}` }}>
            <td className={`px-4 py-3 font-bold ${t.heading}`}>{s.profile?.name}</td>
            <td className={`px-4 py-3 ${t.subheading}`}>{s.profile?.email}</td>
            <td className={`px-4 py-3 font-semibold ${t.heading}`}>{s.class?.name}</td>
            <td className={`px-4 py-3 ${t.heading}`}>{s.parent?.name || "No parent"}</td>
            <td className={`px-4 py-3 ${t.subheading}`}>{s.parent?.email || "-"}</td>
          </tr>
        ))}
      </Table>
      {filtered.length === 0 && <p className={`text-center py-10 ${t.subheading}`}>No students found.</p>}
    </div>
  );
}

function AttendanceView({ t, data }) {
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendance, setAttendance] = useState({});
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!classId && data.classes[0]) setClassId(String(data.classes[0].id));
  }, [data.classes, classId]);

  const students = data.students.filter(s => String(s.class_id) === String(classId));

  const loadAttendance = useCallback(async () => {
    if (!classId || !date) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/teachers/attendance?class_id=${classId}&date=${date}`, { headers: authHeaders() });
      const json = await res.json();
      if (json.success) {
        const next = {};
        json.attendance.forEach(a => { next[a.student_id] = a.status; });
        setAttendance(next);
        setDirty(false);
      } else {
        setMsg({ type: "error", text: json.message });
      }
    } catch {
      setMsg({ type: "error", text: "Failed to load attendance." });
    }
    setLoading(false);
  }, [classId, date]);

  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  const mark = (studentId, status) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
    setDirty(true);
  };

  const markAll = (status) => {
    const next = {};
    students.forEach(s => { next[s.user_id] = status; });
    setAttendance(next);
    setDirty(true);
  };

  const saveAttendance = async () => {
    if (!classId || !date) return;
    setSaving(true);
    setMsg(null);
    try {
      const records = students
        .filter(s => attendance[s.user_id])
        .map(s => ({ student_id: s.user_id, status: attendance[s.user_id] }));

      const res = await fetch(`${API}/teachers/attendance/bulk`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ class_id: classId, date, records }),
      });
      const json = await res.json();
      if (json.success) {
        setDirty(false);
        setMsg({ type: "success", text: `${json.saved} attendance record${json.saved !== 1 ? "s" : ""} saved.` });
      } else {
        setMsg({ type: "error", text: json.message });
      }
    } catch {
      setMsg({ type: "error", text: "Failed to save attendance." });
    }
    setSaving(false);
  };

  return (
    <div>
      <h2 className={`text-2xl font-bold mb-1 ${t.heading}`}>Attendance</h2>
      <p className={`text-sm mb-5 ${t.subheading}`}>Mark attendance for one class and date.</p>
      <Controls t={t}>
        <Field label="Class" t={t}><Select t={t} value={classId} onChange={setClassId} options={data.classes.map(c => [c.id, c.name])} /></Field>
        <Field label="Date" t={t}><Input t={t} type="date" value={date} onChange={setDate} /></Field>
        <Field label="Quick Mark" t={t}>
          <div className="flex flex-wrap gap-2">
            {["Present", "Absent", "Late"].map(status => (
              <button key={status} type="button" onClick={() => markAll(status)}
                className="px-3 py-2 rounded-xl text-xs font-semibold"
                style={{ background: t.inputBg, color: t.navText, border: `1px solid ${t.inputBorder}` }}>
                All {status}
              </button>
            ))}
          </div>
        </Field>
      </Controls>
      <Alert msg={msg} onClose={() => setMsg(null)} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <p className={`text-sm ${dirty ? t.heading : t.subheading}`}>
          {dirty ? "Unsaved attendance changes" : "Attendance record is saved for the current selection"}
        </p>
        <button onClick={saveAttendance} disabled={saving || students.length === 0}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg,#0891b2,#6366f1)" }}>
          {saving ? "Saving..." : "Save Attendance Record"}
        </button>
      </div>
      {loading ? <div className="flex justify-center py-12"><Spinner /></div> : (
        <Table t={t} headers={["Student", "Parent", "Status", "Actions"]}>
          {students.map((s, i) => (
            <tr key={s.user_id} style={{ background: i % 2 === 0 ? t.tableRowEven : t.tableRowOdd, borderTop: `1px solid ${t.cardBorder}` }}>
              <td className={`px-4 py-3 font-bold ${t.heading}`}>{s.profile?.name}</td>
              <td className={`px-4 py-3 ${t.subheading}`}>{s.parent?.name || "-"}</td>
              <td className="px-4 py-3"><Badge tone={attendance[s.user_id] === "Present" ? "good" : attendance[s.user_id] === "Absent" ? "danger" : attendance[s.user_id] === "Late" ? "warn" : "neutral"}>{attendance[s.user_id] || "Not marked"}</Badge></td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  {["Present", "Absent", "Late"].map(status => (
                    <button key={status} onClick={() => mark(s.user_id, status)} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={attendance[s.user_id] === status ? { background: "linear-gradient(135deg,#0891b2,#6366f1)", color: "#fff" } : { background: t.inputBg, color: t.navText, border: `1px solid ${t.inputBorder}` }}>
                      {status}
                    </button>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

function GradesView({ t, data }) {
  const [grades, setGrades] = useState([]);
  const [classId, setClassId] = useState("");
  const [studentReportId, setStudentReportId] = useState("");
  const [studentReport, setStudentReport] = useState(null);
  const [form, setForm] = useState({ type: "exam", date: new Date().toISOString().split("T")[0], max_grade: 100 });
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!classId && data.classes[0]) setClassId(String(data.classes[0].id));
  }, [data.classes, classId]);

  const classStudents = data.students.filter(s => String(s.class_id) === String(classId));
  const classSubjects = data.subjects.filter(s => String(s.class_id) === String(classId));

  useEffect(() => {
    setStudentReportId("");
    setStudentReport(null);
  }, [classId]);

  const loadGrades = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/teachers/grades?class_id=${classId}`, { headers: authHeaders() });
      const json = await res.json();
      if (json.success) setGrades(json.grades);
      else setMsg({ type: "error", text: json.message });
    } catch {
      setMsg({ type: "error", text: "Failed to load grades." });
    }
    setLoading(false);
  }, [classId]);

  useEffect(() => { loadGrades(); }, [loadGrades]);

  const loadStudentReport = useCallback(async (studentId = studentReportId) => {
    if (!studentId) {
      setStudentReport(null);
      return;
    }
    setReportLoading(true);
    try {
      const res = await fetch(`${API}/teachers/students/${studentId}/grades`, { headers: authHeaders() });
      const json = await res.json();
      if (json.success) setStudentReport(json);
      else setMsg({ type: "error", text: json.message });
    } catch {
      setMsg({ type: "error", text: "Failed to load student grade report." });
    }
    setReportLoading(false);
  }, [studentReportId]);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await fetch(`${API}/teachers/grades`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setMsg({ type: "success", text: "Grade saved." });
        setForm({ type: "exam", date: new Date().toISOString().split("T")[0], max_grade: 100 });
        loadGrades();
        if (studentReportId) loadStudentReport();
      } else {
        setMsg({ type: "error", text: json.message });
      }
    } catch {
      setMsg({ type: "error", text: "Failed to save grade." });
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this grade?")) return;
    const res = await fetch(`${API}/teachers/grades/${id}`, { method: "DELETE", headers: authHeaders() });
    const json = await res.json();
    if (json.success) {
      loadGrades();
      if (studentReportId) loadStudentReport();
    }
  };

  const typeCards = studentReport ? [
    ["All Grades", studentReport.summary.total_items, `${studentReport.summary.earned}/${studentReport.summary.possible}`, `${studentReport.summary.percentage}%`, "#4f46e5"],
    ["Exams", studentReport.summary.by_type.exam.count, `${studentReport.summary.by_type.exam.earned}/${studentReport.summary.by_type.exam.possible}`, `${studentReport.summary.by_type.exam.percentage}%`, "#0891b2"],
    ["Quizzes", studentReport.summary.by_type.quiz.count, `${studentReport.summary.by_type.quiz.earned}/${studentReport.summary.by_type.quiz.possible}`, `${studentReport.summary.by_type.quiz.percentage}%`, "#ea580c"],
    ["Homework", studentReport.summary.by_type.homework.count, `${studentReport.summary.by_type.homework.earned}/${studentReport.summary.by_type.homework.possible}`, `${studentReport.summary.by_type.homework.percentage}%`, "#16a34a"],
  ] : [];

  return (
    <div>
      <h2 className={`text-2xl font-bold mb-1 ${t.heading}`}>Grades</h2>
      <p className={`text-sm mb-5 ${t.subheading}`}>Add exam, quiz, or homework grades for your assigned subjects.</p>
      <Controls t={t}>
        <Field label="Class" t={t}><Select t={t} value={classId} onChange={setClassId} options={data.classes.map(c => [c.id, c.name])} /></Field>
        <Field label="Student Grade Report" t={t}>
          <Select
            t={t}
            value={studentReportId}
            onChange={v => {
              setStudentReportId(v);
              loadStudentReport(v);
            }}
            options={classStudents.map(s => [s.user_id, s.profile?.name])}
          />
        </Field>
      </Controls>
      <Alert msg={msg} onClose={() => setMsg(null)} />

      {reportLoading && <div className="flex justify-center py-8"><Spinner /></div>}
      {studentReport && !reportLoading && (
        <div className="rounded-2xl p-5 mb-5" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${t.subheading}`}>Full student grades</p>
              <h3 className={`text-xl font-bold ${t.heading}`}>{studentReport.student.profile?.name}</h3>
              <p className={`text-sm ${t.subheading}`}>
                {studentReport.student.class?.name} | Parent: {studentReport.student.parent?.name || "No parent"}
              </p>
            </div>
            <Badge tone={studentReport.summary.percentage >= 60 ? "good" : "warn"}>{studentReport.summary.percentage}% overall</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
            {typeCards.map(([label, count, score, percent, color]) => (
              <div key={label} className="rounded-xl p-4" style={{ background: t.listItemBg, border: `1px solid ${t.listItemBorder}` }}>
                <p className="text-2xl font-bold" style={{ color }}>{percent}</p>
                <p className={`text-sm font-semibold ${t.heading}`}>{label}</p>
                <p className={`text-xs mt-1 ${t.subheading}`}>{count} item{count !== 1 ? "s" : ""} | {score}</p>
              </div>
            ))}
          </div>
          <Table t={t} headers={["Subject", "Type", "Grade", "Percent", "Date"]}>
            {studentReport.grades.map((g, i) => {
              const pct = Math.round((Number(g.grade_value) / Number(g.max_grade)) * 100);
              return (
                <tr key={g.id} style={{ background: i % 2 === 0 ? t.tableRowEven : t.tableRowOdd, borderTop: `1px solid ${t.cardBorder}` }}>
                  <td className={`px-4 py-3 font-bold ${t.heading}`}>{g.subject?.name}</td>
                  <td className="px-4 py-3"><Badge tone={g.type === "exam" ? "neutral" : g.type === "quiz" ? "warn" : "good"}>{g.type}</Badge></td>
                  <td className={`px-4 py-3 font-semibold ${t.heading}`}>{g.grade_value}/{g.max_grade}</td>
                  <td className={`px-4 py-3 font-semibold ${pct >= 60 ? "text-green-500" : "text-orange-500"}`}>{pct}%</td>
                  <td className={`px-4 py-3 ${t.subheading}`}>{g.date}</td>
                </tr>
              );
            })}
          </Table>
          {studentReport.grades.length === 0 && <p className={`text-center py-8 ${t.subheading}`}>No grades recorded for this student yet.</p>}
        </div>
      )}

      <form onSubmit={submit} className="rounded-2xl p-5 mb-5 grid grid-cols-1 md:grid-cols-3 gap-4" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
        <Field label="Student" t={t}><Select t={t} required value={form.student_id || ""} onChange={v => setForm(f => ({ ...f, student_id: v }))} options={classStudents.map(s => [s.user_id, s.profile?.name])} /></Field>
        <Field label="Subject" t={t}><Select t={t} required value={form.subject_id || ""} onChange={v => setForm(f => ({ ...f, subject_id: v }))} options={classSubjects.map(s => [s.subject_id, s.subject?.name])} /></Field>
        <Field label="Type" t={t}><Select t={t} value={form.type} onChange={v => setForm(f => ({ ...f, type: v }))} options={[["exam", "Exam"], ["quiz", "Quiz"], ["homework", "Homework"]]} /></Field>
        <Field label="Grade" t={t}><Input t={t} required type="number" value={form.grade_value || ""} onChange={v => setForm(f => ({ ...f, grade_value: v }))} /></Field>
        <Field label="Max Grade" t={t}><Input t={t} required type="number" value={form.max_grade || ""} onChange={v => setForm(f => ({ ...f, max_grade: v }))} /></Field>
        <Field label="Date" t={t}><Input t={t} required type="date" value={form.date || ""} onChange={v => setForm(f => ({ ...f, date: v }))} /></Field>
        <button className="md:col-span-3 py-3 rounded-xl text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg,#0891b2,#6366f1)" }}>Save Grade</button>
      </form>
      {loading ? <div className="flex justify-center py-12"><Spinner /></div> : (
        <Table t={t} headers={["Student", "Subject", "Type", "Grade", "Date", ""]}>
          {grades.map((g, i) => {
            const pct = Math.round((Number(g.grade_value) / Number(g.max_grade)) * 100);
            return (
              <tr key={g.id} style={{ background: i % 2 === 0 ? t.tableRowEven : t.tableRowOdd, borderTop: `1px solid ${t.cardBorder}` }}>
                <td className={`px-4 py-3 font-bold ${t.heading}`}>{g.student?.profile?.name}</td>
                <td className={`px-4 py-3 ${t.heading}`}>{g.subject?.name}</td>
                <td className="px-4 py-3"><Badge tone={g.type === "exam" ? "neutral" : "warn"}>{g.type}</Badge></td>
                <td className={`px-4 py-3 font-semibold ${t.heading}`}>{g.grade_value}/{g.max_grade} <span className={t.subheading}>({pct}%)</span></td>
                <td className={`px-4 py-3 ${t.subheading}`}>{g.date}</td>
                <td className="px-4 py-3 text-right"><button onClick={() => remove(g.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ color: "#dc2626", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>Delete</button></td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}

function AnnouncementsView({ t, data }) {
  const [announcements, setAnnouncements] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [target, setTarget] = useState("class");
  const [audience, setAudience] = useState("both");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ title: "", content: "", date: new Date().toISOString().split("T")[0], class_id: "" });
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!form.class_id && data.classes[0]) setForm(f => ({ ...f, class_id: data.classes[0].id }));
  }, [data.classes, form.class_id]);

  const load = useCallback(async () => {
    try {
      const [aRes, rRes] = await Promise.all([
        fetch(`${API}/teachers/announcements`, { headers: authHeaders() }),
        fetch(`${API}/teachers/announcement-recipients`, { headers: authHeaders() }),
      ]);
      const [aData, rData] = await Promise.all([aRes.json(), rRes.json()]);
      if (aData.success) setAnnouncements(aData.announcements);
      if (rData.success) setRecipients(rData.users);
    } catch {
      setMsg({ type: "error", text: "Failed to load announcements." });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredRecipients = recipients.filter(u => {
    const q = search.toLowerCase();
    return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.student_name || "").toLowerCase().includes(q);
  });

  const toggleUser = (u) => {
    setSelectedUsers(prev => prev.some(x => x.id === u.id) ? prev.filter(x => x.id !== u.id) : [...prev, u]);
  };

  const send = async (e) => {
    e.preventDefault();
    setMsg(null);
    const body = {
      ...form,
      target,
      audience,
      user_ids: selectedUsers.map(u => u.id),
    };
    try {
      const res = await fetch(`${API}/teachers/announcements`, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        setMsg({ type: "success", text: `Announcement sent to ${json.recipients} recipient${json.recipients !== 1 ? "s" : ""}.` });
        setForm({ title: "", content: "", date: new Date().toISOString().split("T")[0], class_id: data.classes[0]?.id || "" });
        setSelectedUsers([]);
        load();
      } else {
        setMsg({ type: "error", text: json.message });
      }
    } catch {
      setMsg({ type: "error", text: "Failed to send announcement." });
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    const res = await fetch(`${API}/teachers/announcements/${id}`, { method: "DELETE", headers: authHeaders() });
    const json = await res.json();
    if (json.success) load();
  };

  return (
    <div>
      <h2 className={`text-2xl font-bold mb-1 ${t.heading}`}>Announcements</h2>
      <p className={`text-sm mb-5 ${t.subheading}`}>Send announcements to students and parents in your classes.</p>
      <Alert msg={msg} onClose={() => setMsg(null)} />
      <form onSubmit={send} className="rounded-2xl p-5 mb-6 space-y-4" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
        <div className="flex flex-wrap gap-2">
          {[["class", "Whole Class"], ["specific", "Specific People"]].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setTarget(id)} className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={target === id ? { background: "linear-gradient(135deg,#0891b2,#6366f1)", color: "#fff" } : { background: t.inputBg, color: t.navText, border: `1px solid ${t.inputBorder}` }}>
              {label}
            </button>
          ))}
        </div>
        {target === "class" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Class" t={t}><Select t={t} value={form.class_id || ""} onChange={v => setForm(f => ({ ...f, class_id: v }))} options={data.classes.map(c => [c.id, c.name])} /></Field>
            <Field label="Send To" t={t}><Select t={t} value={audience} onChange={setAudience} options={[["both", "Students and Parents"], ["students", "Students Only"], ["parents", "Parents Only"]]} /></Field>
          </div>
        ) : (
          <div className="space-y-3">
            <Input t={t} placeholder="Search student, parent, or email" value={search} onChange={setSearch} />
            <div className="max-h-52 overflow-auto rounded-xl" style={{ border: `1px solid ${t.listItemBorder}` }}>
              {filteredRecipients.map(u => {
                const chosen = selectedUsers.some(x => x.id === u.id);
                return (
                  <button key={u.id} type="button" onClick={() => toggleUser(u)}
                    className="w-full flex items-center justify-between gap-4 px-4 py-2.5 text-left"
                    style={{ background: chosen ? t.activeListBg : t.listItemBg, borderBottom: `1px solid ${t.listItemBorder}` }}>
                    <div>
                      <p className={`text-sm font-bold ${t.heading}`}>{u.name}</p>
                      <p className={`text-xs ${t.subheading}`}>{u.email} | {u.relation}{u.student_name ? ` of ${u.student_name}` : ""}</p>
                    </div>
                    {chosen && <Badge tone="good">Selected</Badge>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Title" t={t}><Input t={t} required value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} /></Field>
          <Field label="Date" t={t}><Input t={t} required type="date" value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} /></Field>
        </div>
        <Field label="Message" t={t}><Textarea t={t} required value={form.content} onChange={v => setForm(f => ({ ...f, content: v }))} /></Field>
        <button className="w-full py-3 rounded-xl text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg,#0891b2,#6366f1)" }}>Send Announcement</button>
      </form>
      <div className="space-y-4">
        {announcements.map(a => (
          <div key={a.id} className="rounded-2xl p-5" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className={`font-bold ${t.heading}`}>{a.title}</h3>
                <p className={`text-sm mt-1 whitespace-pre-wrap ${t.subheading}`}>{a.content}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge tone="neutral">{a.date}</Badge>
                  <Badge tone="good">{a.receivers?.length || 0} recipients</Badge>
                </div>
              </div>
              <button onClick={() => remove(a.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ color: "#dc2626", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>Delete</button>
            </div>
          </div>
        ))}
        {announcements.length === 0 && <p className={`text-center py-10 ${t.subheading}`}>No announcements sent yet.</p>}
      </div>
    </div>
  );
}

function Controls({ t, children }) {
  return <div className="rounded-2xl p-5 mb-5 grid grid-cols-1 md:grid-cols-3 gap-4" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>{children}</div>;
}

function Input({ t, value, onChange, type = "text", placeholder = "", required = false }) {
  return <input type={type} value={value} required={required} placeholder={placeholder} onChange={e => onChange(e.target.value)}
    className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${t.inputText} ${t.inputPlaceholder}`}
    style={{ background: t.fieldBg, color: t.fieldText, border: `1px solid ${t.fieldBorder}` }} />;
}

function Textarea({ t, value, onChange, required = false }) {
  return <textarea value={value} required={required} rows={4} onChange={e => onChange(e.target.value)}
    className={`w-full px-4 py-3 rounded-xl text-sm outline-none resize-none ${t.inputText} ${t.inputPlaceholder}`}
    style={{ background: t.fieldBg, color: t.fieldText, border: `1px solid ${t.fieldBorder}` }} />;
}

function Select({ t, value, onChange, options, required = false }) {
  return (
    <select value={value} required={required} onChange={e => onChange(e.target.value)}
      className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${t.inputText}`}
      style={{ background: t.fieldBg, color: t.fieldText, border: `1px solid ${t.fieldBorder}` }}>
      <option value="">Select</option>
      {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>
  );
}

function Table({ t, headers, children }) {
  return (
    <div className="rounded-2xl overflow-auto" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
      <table className="w-full text-sm min-w-[760px]">
        <thead>
          <tr style={{ background: t.tableHeadBg }}>
            {headers.map(h => <th key={h} className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${t.label}`}>{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export default function Teacher({ onLogout }) {
  const [view, setView] = useState("dashboard");
  const [dark, setDark] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const data = useTeacherData();
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");

  const t = dark ? {
    pageBg: "#0b1120",
    sidebarBg: "#111827",
    sidebarBorder: "rgba(148,163,184,0.22)",
    cardBg: "#111827",
    cardBorder: "rgba(148,163,184,0.24)",
    heading: "text-white",
    subheading: "text-slate-300",
    label: "text-slate-200",
    inputBg: "#1f2937",
    inputBorder: "rgba(148,163,184,0.28)",
    fieldBg: "#1f2937",
    fieldBorder: "rgba(148,163,184,0.34)",
    fieldText: "#f8fafc",
    listItemBg: "#1f2937",
    listItemBorder: "rgba(148,163,184,0.3)",
    activeListBg: "linear-gradient(135deg,rgba(8,145,178,0.42),rgba(99,102,241,0.34))",
    inputText: "text-white",
    inputPlaceholder: "placeholder-slate-500",
    navText: "#cbd5e1",
    toggleBg: "rgba(255,255,255,0.07)",
    toggleBorder: "rgba(255,255,255,0.12)",
    toggleIcon: "text-yellow-300",
    tableHeadBg: "#1e293b",
    tableRowEven: "#111827",
    tableRowOdd: "#1f2937",
  } : {
    pageBg: "#e2e8f0",
    sidebarBg: "#ffffff",
    sidebarBorder: "#cbd5e1",
    cardBg: "#ffffff",
    cardBorder: "#cbd5e1",
    heading: "text-slate-900",
    subheading: "text-slate-500",
    label: "text-slate-700",
    inputBg: "#f1f5f9",
    inputBorder: "#94a3b8",
    fieldBg: "#f1f5f9",
    fieldBorder: "#94a3b8",
    fieldText: "#0f172a",
    listItemBg: "#f8fafc",
    listItemBorder: "#cbd5e1",
    activeListBg: "linear-gradient(135deg,rgba(8,145,178,0.15),rgba(99,102,241,0.12))",
    inputText: "text-slate-900",
    inputPlaceholder: "placeholder-slate-400",
    navText: "#334155",
    toggleBg: "#e2e8f0",
    toggleBorder: "#94a3b8",
    toggleIcon: "text-slate-600",
    tableHeadBg: "#e2e8f0",
    tableRowEven: "#ffffff",
    tableRowOdd: "#f8fafc",
  };

  const nav = [
    { id: "dashboard",    icon: "D", label: "Dashboard" },
    { id: "schedule",     icon: "T", label: "My Schedule" },
    { id: "classes",      icon: "C", label: "My Classes" },
    { id: "students",     icon: "S", label: "Students" },
    { id: "attendance",   icon: "A", label: "Attendance" },
    { id: "grades",       icon: "G", label: "Grades" },
    { id: "announcements",icon: "N", label: "Announcements" },
  ];

  const sidebar = (
    <aside className="w-64 h-full flex flex-col p-4" style={{ background: t.sidebarBg, borderRight: `1px solid ${t.sidebarBorder}` }}>
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: "linear-gradient(135deg,#0891b2,#6366f1)" }}>T</div>
        <div>
          <p className={`text-sm font-bold ${t.heading}`}>Teacher Portal</p>
          <p className={`text-xs ${t.subheading}`}>School Management</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1">
        {nav.map(item => (
          <button key={item.id} onClick={() => { setView(item.id); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
            style={view === item.id
              ? { background: "linear-gradient(135deg,rgba(8,145,178,0.2),rgba(99,102,241,0.2))", color: "#0891b2", border: "1px solid rgba(8,145,178,0.28)" }
              : { color: t.navText, border: "1px solid transparent" }}>
            <span className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold" style={{ background: t.inputBg }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="pt-4" style={{ borderTop: `1px solid ${t.sidebarBorder}` }}>
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "linear-gradient(135deg,#0891b2,#6366f1)" }}>
            {user.name?.[0]?.toUpperCase() || "T"}
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-semibold truncate ${t.heading}`}>{user.name || "Teacher"}</p>
            <p className={`text-xs ${t.subheading}`}>Teacher</p>
          </div>
        </div>
        <button onClick={onLogout} className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <Icon name="logout" /> Logout
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen flex" style={{ background: t.pageBg }}>
      <div className="hidden lg:block h-screen sticky top-0">{sidebar}</div>
      {sidebarOpen && <div className="fixed inset-0 z-40 flex lg:hidden"><div>{sidebar}</div><button className="flex-1 bg-black/50" onClick={() => setSidebarOpen(false)} /></div>}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4" style={{ background: t.sidebarBg, borderBottom: `1px solid ${t.sidebarBorder}`, backdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 rounded-xl" style={{ background: t.inputBg, color: t.navText }} onClick={() => setSidebarOpen(true)}><Icon name="menu" /></button>
            <p className={`font-semibold ${t.heading}`}>{nav.find(n => n.id === view)?.label}</p>
          </div>
          <button onClick={() => setDark(!dark)} className={`w-9 h-9 rounded-xl flex items-center justify-center ${t.toggleIcon}`} style={{ background: t.toggleBg, border: `1px solid ${t.toggleBorder}` }}>
            <Icon name={dark ? "sun" : "moon"} />
          </button>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          {data.msg && <Alert msg={data.msg} onClose={() => data.setMsg(null)} />}
          {data.loading ? <div className="flex justify-center py-20"><Spinner /></div> : (
            <>
              {view === "dashboard"    && <DashboardView t={t} data={data} onNavigate={setView} />}
              {view === "schedule"     && <ScheduleView t={t} />}
              {view === "classes"      && <ClassesView t={t} data={data} />}
              {view === "students"     && <StudentsView t={t} data={data} />}
              {view === "attendance"   && <AttendanceView t={t} data={data} />}
              {view === "grades"       && <GradesView t={t} data={data} />}
              {view === "announcements"&& <AnnouncementsView t={t} data={data} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
