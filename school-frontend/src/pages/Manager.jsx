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
  const icons = {
    dashboard: "M4 13h6V4H4v9zm10 7h6V4h-6v16zM4 20h6v-5H4v5z",
    classes: "M12 6.253v13M12 6.253C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253M12 6.253C13.168 5.477 14.754 5 16.5 5S19.832 5.477 21 6.253v13C19.832 18.477 18.246 18 16.5 18s-3.332.477-4.5 1.253",
    students: "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6 5.87v-2a4 4 0 00-8 0v2m8 0H5m8-9a4 4 0 11-8 0 4 4 0 018 0zm8 0a3 3 0 11-6 0 3 3 0 016 0z",
    reports: "M9 17v-6m4 6V7m4 10v-3M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z",
    announcements: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0m6 0H9",
    plus: "M12 4v16m8-8H4",
    search: "M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z",
    menu: "M4 6h16M4 12h16M4 18h16",
    logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
    sun: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z",
    moon: "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z",
  };

  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={icons[name]} />
    </svg>
  );
}

function Alert({ msg, onClose }) {
  if (!msg) return null;
  const ok = msg.type === "success";
  return (
    <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl mb-4"
      style={ok
        ? { background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)" }
        : { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
      <p className={`text-sm ${ok ? "text-green-400" : "text-red-400"}`}>{msg.text}</p>
      {onClose && (
        <button onClick={onClose} className={`text-xs font-bold ${ok ? "text-green-400" : "text-red-400"} opacity-70 hover:opacity-100`}>
          X
        </button>
      )}
    </div>
  );
}

function Badge({ children, tone = "neutral" }) {
  const styles = {
    good: { background: "rgba(34,197,94,0.16)", color: "#16a34a", border: "1px solid rgba(34,197,94,0.34)" },
    warn: { background: "rgba(249,115,22,0.16)", color: "#ea580c", border: "1px solid rgba(249,115,22,0.34)" },
    danger: { background: "rgba(239,68,68,0.16)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.34)" },
    neutral: { background: "rgba(99,102,241,0.16)", color: "#4f46e5", border: "1px solid rgba(99,102,241,0.34)" },
  };
  return <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={styles[tone]}>{children}</span>;
}

function DashboardView({ t, onNavigate }) {
  const [stats, setStats] = useState({ classes: 0, students: 0, teachers: 0, unassigned: 0 });
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");

  useEffect(() => {
    Promise.all([
      fetch(`${API}/manager/classes`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`${API}/manager/students`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`${API}/manager/assignments`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`${API}/manager/teachers`, { headers: authHeaders() }).then(r => r.json()),
    ]).then(([c, s, a, tr]) => {
      const assignments = a.success ? a.assignments : [];
      setStats({
        classes: c.success ? c.classes.length : 0,
        students: s.success ? s.students.length : 0,
        teachers: tr.success ? tr.teachers.length : 0,
        unassigned: assignments.filter(x => !x.teacher_id).length,
      });
    }).catch(() => {});
  }, []);

  const cards = [
    { label: "Classes", value: stats.classes, color: "#4f46e5", nav: "setup", icon: "🏫" },
    { label: "Students", value: stats.students, color: "#16a34a", nav: "students", icon: "🎓" },
    { label: "Teachers", value: stats.teachers, color: "#0891b2", nav: "setup", icon: "👩‍🏫" },
    { label: "Need Teacher", value: stats.unassigned, color: "#ea580c", nav: "reports", icon: "📊" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className={`text-2xl font-bold mb-1 ${t.heading}`}>Welcome, {user.name || "Manager"}</h2>
        <p className={`text-sm ${t.subheading}`}>Manage class setup, teacher coverage, and student placement from one workspace.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {cards.map(c => (
          <button key={c.label} onClick={() => onNavigate(c.nav)}
            className="rounded-2xl p-5 text-left transition-all hover:scale-[1.01]"
            style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl">{c.icon}</span>
              <span className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</span>
            </div>
            <p className={`text-sm font-semibold ${t.heading}`}>{c.label}</p>
            <p className={`text-xs mt-1 ${t.subheading}`}>Open workspace</p>
          </button>
        ))}
      </div>

      <div className="rounded-2xl p-6" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
        <p className={`text-sm font-semibold mb-4 ${t.label}`}>Recommended workflow</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            ["1", "Choose a class", "Filter or search for the class you want to set up."],
            ["2", "Add subjects", "Add every subject taught in that class."],
            ["3", "Assign teachers", "Pick the teacher from each subject row."],
          ].map(([step, title, body]) => (
            <button key={step} onClick={() => onNavigate("setup")}
              className="text-left rounded-xl p-4"
              style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}` }}>
              <span className="inline-flex w-7 h-7 rounded-lg items-center justify-center text-xs font-bold text-white mb-3"
                style={{ background: "linear-gradient(135deg,#0891b2,#6366f1)" }}>{step}</span>
              <p className={`text-sm font-semibold ${t.heading}`}>{title}</p>
              <p className={`text-xs mt-1 ${t.subheading}`}>{body}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ClassSetupView({ t, initialClassId }) {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(initialClassId || null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [gradeFilter, setGradeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [newSubjectId, setNewSubjectId] = useState("");
  const [newTeacherId, setNewTeacherId] = useState("");
  const [savingAdd, setSavingAdd] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [msg, setMsg] = useState(null);

  const loadBase = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, sRes, tRes] = await Promise.all([
        fetch(`${API}/manager/classes`, { headers: authHeaders() }),
        fetch(`${API}/manager/subjects`, { headers: authHeaders() }),
        fetch(`${API}/manager/teachers`, { headers: authHeaders() }),
      ]);
      const [cData, sData, tData] = await Promise.all([cRes.json(), sRes.json(), tRes.json()]);
      if (cData.success) setClasses(cData.classes);
      if (sData.success) setSubjects(sData.subjects);
      if (tData.success) setTeachers(tData.teachers);
    } catch {
      setMsg({ type: "error", text: "Could not load setup data." });
    }
    setLoading(false);
  }, []);

  const loadDetail = useCallback(async (id) => {
    if (!id) return;
    setSelected(id);
    setDetailLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`${API}/manager/classes/${id}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setDetail(data);
      else setMsg({ type: "error", text: data.message || "Could not load class." });
    } catch {
      setMsg({ type: "error", text: "Could not load class." });
    }
    setDetailLoading(false);
  }, []);

  useEffect(() => { loadBase(); }, [loadBase]);
  useEffect(() => {
    if (!loading && selected) loadDetail(selected);
  }, [loading, selected, loadDetail]);

  const refreshDetail = useCallback(() => {
    if (selected) loadDetail(selected);
  }, [selected, loadDetail]);

  const handleAddSubject = async () => {
    if (!selected || !newSubjectId) return;
    setSavingAdd(true);
    setMsg(null);
    try {
      const res = await fetch(`${API}/manager/assignments`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ class_id: selected, subject_id: newSubjectId, teacher_id: newTeacherId || null }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: "success", text: "Subject added to this class." });
        setNewSubjectId("");
        setNewTeacherId("");
        refreshDetail();
      } else {
        setMsg({ type: "error", text: data.message });
      }
    } catch {
      setMsg({ type: "error", text: "Failed to add subject." });
    }
    setSavingAdd(false);
  };

  const handleAssignTeacher = async (assignmentId, teacherId) => {
    setUpdatingId(assignmentId);
    setMsg(null);
    try {
      const res = await fetch(`${API}/manager/assignments/${assignmentId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ teacher_id: teacherId || null }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: "success", text: teacherId ? "Teacher assigned." : "Teacher removed." });
        refreshDetail();
      } else {
        setMsg({ type: "error", text: data.message });
      }
    } catch {
      setMsg({ type: "error", text: "Failed to update teacher." });
    }
    setUpdatingId(null);
  };

  const handleRemoveSubject = async (assignmentId) => {
    if (!window.confirm("Remove this subject from the class?")) return;
    setMsg(null);
    try {
      const res = await fetch(`${API}/manager/assignments/${assignmentId}`, { method: "DELETE", headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: "success", text: "Subject removed." });
        refreshDetail();
      } else {
        setMsg({ type: "error", text: data.message });
      }
    } catch {
      setMsg({ type: "error", text: "Failed to remove subject." });
    }
  };

  const grades = [...new Set(classes.map(c => c.grade_level))].sort((a, b) => a - b);
  const query = search.trim().toLowerCase();
  const filteredClasses = classes.filter(c => {
    const gradeOk = gradeFilter === "all" || c.grade_level === gradeFilter;
    const searchOk = !query || c.name.toLowerCase().includes(query) || c.section.toLowerCase().includes(query);
    return gradeOk && searchOk;
  });
  const usedSubjectIds = detail?.assignments?.map(a => a.subject_id) || [];
  const availableSubjects = subjects.filter(s => !usedSubjectIds.includes(s.id));
  const assignedCount = detail?.assignments?.filter(a => a.teacher_id).length || 0;
  const totalSubjects = detail?.assignments?.length || 0;
  const coverage = totalSubjects ? Math.round((assignedCount / totalSubjects) * 100) : 0;
  const inputClass = `w-full px-3.5 py-3 rounded-xl text-sm font-medium outline-none ${t.inputText}`;

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;

  return (
    <div>
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4 mb-6">
        <div>
          <h2 className={`text-2xl font-bold mb-1 ${t.heading}`}>Class Assignments</h2>
          <p className={`text-sm ${t.subheading}`}>Choose a class, add subjects, and assign a teacher for each subject.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {["all", ...grades].map(g => (
            <button key={g} onClick={() => setGradeFilter(g)}
              className="px-3 py-2 rounded-xl text-xs font-semibold"
              style={gradeFilter === g
                ? { background: "linear-gradient(135deg,#0891b2,#6366f1)", color: "#fff" }
                : { background: t.inputBg, color: t.navText, border: `1px solid ${t.inputBorder}` }}>
              {g === "all" ? "All grades" : `Grade ${g}`}
            </button>
          ))}
        </div>
      </div>

      <Alert msg={msg} onClose={() => setMsg(null)} />

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-5">
        <section className="rounded-2xl p-4 h-fit" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
          <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${t.subheading}`}>Find class</label>
          <div className="relative mb-4">
            <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by class or section"
              className={`w-full pl-10 pr-3 py-2.5 rounded-xl text-sm outline-none ${t.inputText} ${t.inputPlaceholder}`}
              style={{ background: t.fieldBg, border: `1px solid ${t.fieldBorder}`, color: t.fieldText }}
            />
          </div>

          <div className="space-y-2 max-h-[620px] overflow-auto pr-1">
            {filteredClasses.length === 0 ? (
              <p className={`text-sm py-8 text-center ${t.subheading}`}>No classes found.</p>
            ) : filteredClasses.map(cls => {
              const active = selected === cls.id;
              return (
                <button key={cls.id} onClick={() => loadDetail(cls.id)}
                  className="w-full text-left p-4 rounded-xl transition-all"
                  style={active
                    ? { background: t.activeListBg, border: "1px solid rgba(34,211,238,0.65)", boxShadow: "0 0 0 1px rgba(34,211,238,0.12)" }
                    : { background: t.listItemBg, border: `1px solid ${t.listItemBorder}` }}>
                  <div className="flex items-center justify-between gap-3">
                    <p className={`font-bold text-base ${active ? "" : t.heading}`} style={active ? { color: t.activeText } : undefined}>{cls.name}</p>
                    <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: t.badgeBg, color: t.fieldText }}>{cls.student_count}</span>
                  </div>
                  <p className={`text-xs mt-1 font-medium ${t.subheading}`}>Students enrolled</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="min-w-0">
          {detailLoading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : detail ? (
            <div className="space-y-5">
              <div className="rounded-2xl p-5" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${t.subheading}`}>Selected class</p>
                    <h3 className={`text-2xl font-bold ${t.heading}`}>{detail.class.name}</h3>
                    <p className={`text-sm mt-1 ${t.subheading}`}>{detail.students.length} students in this class</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 min-w-full lg:min-w-[360px]">
                    {[
                      ["Subjects", totalSubjects, "#4f46e5"],
                      ["Assigned", assignedCount, "#16a34a"],
                      ["Coverage", `${coverage}%`, coverage === 100 ? "#16a34a" : "#ea580c"],
                    ].map(([label, value, color]) => (
                      <div key={label} className="rounded-xl p-3" style={{ background: t.listItemBg, border: `1px solid ${t.listItemBorder}` }}>
                        <p className="text-lg font-bold" style={{ color }}>{value}</p>
                        <p className={`text-xs ${t.subheading}`}>{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 rounded-full h-2" style={{ background: t.inputBorder }}>
                  <div className="h-2 rounded-full transition-all" style={{ width: `${coverage}%`, background: coverage === 100 ? "#16a34a" : "#0891b2" }} />
                </div>
              </div>

              <div className="rounded-2xl p-5" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className={`font-bold ${t.heading}`}>Add subject</h3>
                    <p className={`text-sm ${t.subheading}`}>Add a subject and optionally assign a teacher immediately.</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: "linear-gradient(135deg,#0891b2,#6366f1)" }}>
                    <Icon name="plus" />
                  </div>
                </div>

                {availableSubjects.length === 0 ? (
                  <p className={`text-sm rounded-xl p-4 ${t.subheading}`} style={{ background: t.listItemBg, border: `1px solid ${t.listItemBorder}` }}>
                    Every available subject is already added to this class.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${t.label}`}>Subject</label>
                      <select value={newSubjectId} onChange={e => setNewSubjectId(e.target.value)}
                        className={inputClass} style={{ background: t.fieldBg, border: `1px solid ${t.fieldBorder}`, color: t.fieldText }}>
                        <option value="">Choose subject</option>
                        {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${t.label}`}>Teacher</label>
                      <select value={newTeacherId} onChange={e => setNewTeacherId(e.target.value)}
                        className={inputClass} style={{ background: t.fieldBg, border: `1px solid ${t.fieldBorder}`, color: t.fieldText }}>
                        <option value="">Unassigned for now</option>
                        {teachers.map(tc => <option key={tc.id} value={tc.id}>{tc.name}</option>)}
                      </select>
                    </div>
                    <button onClick={handleAddSubject} disabled={!newSubjectId || savingAdd}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                      style={{ background: "linear-gradient(135deg,#0891b2,#6366f1)" }}>
                      {savingAdd ? "Adding..." : "Add Subject"}
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-2xl overflow-hidden" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
                <div className="px-5 py-4" style={{ background: t.tableHeadBg }}>
                  <h3 className={`font-bold ${t.heading}`}>Teacher assignments</h3>
                  <p className={`text-sm ${t.subheading}`}>Use the teacher menu on each subject row.</p>
                </div>

                {detail.assignments.length === 0 ? (
                  <div className={`text-center py-12 ${t.subheading}`}>
                    <p className="text-sm">No subjects have been added to this class yet.</p>
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: t.cardBorder }}>
                    {detail.assignments.map(a => (
                      <div key={a.id} className="grid grid-cols-1 lg:grid-cols-[1fr_280px_auto] gap-3 p-5 items-center" style={{ background: t.listItemBg }}>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className={`font-bold text-base truncate ${t.heading}`}>{a.subject?.name || "Subject"}</p>
                            <Badge tone={a.teacher ? "good" : "warn"}>{a.teacher ? "Assigned" : "Needs teacher"}</Badge>
                          </div>
                          <p className={`text-sm font-medium ${t.subheading}`}>{a.teacher ? a.teacher.name : "No teacher selected"}</p>
                        </div>

                        <select
                          value={a.teacher_id || ""}
                          disabled={updatingId === a.id}
                          onChange={e => handleAssignTeacher(a.id, e.target.value)}
                          className={`${inputClass} disabled:opacity-50`}
                          style={{ background: t.fieldBg, border: `1px solid ${t.fieldBorder}`, color: t.fieldText }}>
                          <option value="">Unassigned</option>
                          {teachers.map(tc => <option key={tc.id} value={tc.id}>{tc.name}</option>)}
                        </select>

                        <button onClick={() => handleRemoveSubject(a.id)}
                          className="px-3 py-2 rounded-xl text-xs font-semibold justify-self-start lg:justify-self-end"
                          style={{ color: "#dc2626", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)" }}>
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl overflow-hidden" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
                <div className="px-5 py-4" style={{ background: t.tableHeadBg }}>
                  <h3 className={`font-bold ${t.heading}`}>Students in this class</h3>
                </div>
                {detail.students.length === 0 ? (
                  <p className={`px-5 py-6 text-sm ${t.subheading}`}>No students enrolled in this class.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-5">
                    {detail.students.map(s => (
                      <div key={s.user_id} className="rounded-xl p-3.5" style={{ background: t.listItemBg, border: `1px solid ${t.listItemBorder}` }}>
                        <p className={`text-sm font-bold ${t.heading}`}>{s.profile.name}</p>
                        <p className={`text-xs font-medium truncate ${t.subheading}`}>{s.profile.email}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={`flex flex-col items-center justify-center min-h-[420px] rounded-2xl gap-3 ${t.subheading}`}
              style={{ background: t.cardBg, border: `1px dashed ${t.cardBorder}` }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white" style={{ background: "linear-gradient(135deg,#0891b2,#6366f1)" }}>
                <Icon name="classes" className="w-6 h-6" />
              </div>
              <p className={`text-sm font-semibold ${t.heading}`}>Select a class to start assigning teachers</p>
              <p className="text-sm">The setup tools will appear here.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StudentsView({ t }) {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState(null);
  const [moving, setMoving] = useState(null);
  const [targetClass, setTargetClass] = useState("");
  const [records, setRecords] = useState(null);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, cRes] = await Promise.all([
        fetch(`${API}/manager/students`, { headers: authHeaders() }),
        fetch(`${API}/manager/classes`, { headers: authHeaders() }),
      ]);
      const [sData, cData] = await Promise.all([sRes.json(), cRes.json()]);
      if (sData.success) setStudents(sData.students);
      if (cData.success) setClasses(cData.classes);
    } catch {
      setMsg({ type: "error", text: "Failed to load students." });
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMove = async () => {
    if (!targetClass || !moving) return;
    setMsg(null);
    try {
      const res = await fetch(`${API}/manager/students/${moving.userId}/move`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ class_id: targetClass }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: "success", text: `${moving.name} moved successfully.` });
        setMoving(null);
        setTargetClass("");
        load();
      } else {
        setMsg({ type: "error", text: data.message });
      }
    } catch {
      setMsg({ type: "error", text: "Failed to move student." });
    }
  };

  const loadRecords = async (student) => {
    setRecordsLoading(true);
    setRecords(null);
    setMsg(null);
    try {
      const res = await fetch(`${API}/manager/students/${student.user_id}/records`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setRecords(data);
      else setMsg({ type: "error", text: data.message || "Failed to load student records." });
    } catch {
      setMsg({ type: "error", text: "Failed to load student records." });
    }
    setRecordsLoading(false);
  };

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    return s.profile.name.toLowerCase().includes(q) || s.profile.email.toLowerCase().includes(q) || (s.class?.name || "").toLowerCase().includes(q);
  });

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;

  return (
    <div>
      <h2 className={`text-2xl font-bold mb-1 ${t.heading}`}>Students</h2>
      <p className={`text-sm mb-5 ${t.subheading}`}>Search students and move them between classes.</p>
      <Alert msg={msg} onClose={() => setMsg(null)} />

      {moving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
            <h3 className={`text-lg font-bold mb-1 ${t.heading}`}>Move Student</h3>
            <p className={`text-sm mb-5 ${t.subheading}`}>Move <span className="font-semibold" style={{ color: t.fieldText }}>{moving.name}</span> from {moving.currentClass}</p>
            <label className={`block text-sm font-medium mb-2 ${t.label}`}>New Class</label>
            <select value={targetClass} onChange={e => setTargetClass(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl text-sm font-medium outline-none mb-5 ${t.inputText}`}
              style={{ background: t.fieldBg, border: `1px solid ${t.fieldBorder}`, color: t.fieldText }}>
              <option value="">Choose class</option>
              {classes.filter(c => c.id !== moving.classId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={handleMove} disabled={!targetClass}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#0891b2,#6366f1)" }}>Move</button>
              <button onClick={() => { setMoving(null); setTargetClass(""); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${t.subheading}`}
                style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}` }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {(records || recordsLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-5xl max-h-[90vh] overflow-auto rounded-2xl p-6 shadow-2xl" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h3 className={`text-xl font-bold ${t.heading}`}>{records?.student?.profile?.name || "Student Records"}</h3>
                <p className={`text-sm ${t.subheading}`}>
                  {records?.student?.class?.name || ""}{records?.student?.parent ? ` | Parent: ${records.student.parent.name}` : ""}
                </p>
              </div>
              <button onClick={() => { setRecords(null); setRecordsLoading(false); }} className={`px-3 py-2 rounded-xl text-sm font-semibold ${t.subheading}`}
                style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}` }}>Close</button>
            </div>

            {recordsLoading ? <div className="flex justify-center py-16"><Spinner /></div> : records && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {[
                    ["Grade Average", `${records.summaries.grades.percentage}%`, `${records.summaries.grades.earned}/${records.summaries.grades.possible}`, "#4f46e5"],
                    ["Marks", records.summaries.grades.count, "total records", "#0891b2"],
                    ["Attendance", `${records.summaries.attendance.percentage}%`, `${records.summaries.attendance.present}/${records.summaries.attendance.total} present`, "#16a34a"],
                    ["Absent/Late", `${records.summaries.attendance.absent}/${records.summaries.attendance.late}`, "absent / late", "#ea580c"],
                  ].map(([label, value, note, color]) => (
                    <div key={label} className="rounded-xl p-4" style={{ background: t.listItemBg, border: `1px solid ${t.listItemBorder}` }}>
                      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
                      <p className={`text-sm font-semibold ${t.heading}`}>{label}</p>
                      <p className={`text-xs mt-1 ${t.subheading}`}>{note}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <h4 className={`font-bold mb-3 ${t.heading}`}>Marks</h4>
                  <div className="rounded-2xl overflow-auto" style={{ border: `1px solid ${t.cardBorder}`, background: t.cardBg }}>
                    <table className="w-full text-sm min-w-[720px]">
                      <thead><tr style={{ background: t.tableHeadBg }}>{["Subject", "Teacher", "Type", "Mark", "Date"].map(h => <th key={h} className={`px-4 py-3 text-left text-xs font-bold uppercase ${t.label}`}>{h}</th>)}</tr></thead>
                      <tbody>
                        {records.grades.length === 0 ? <tr><td colSpan={5} className={`px-4 py-8 text-center ${t.subheading}`}>No marks found.</td></tr> : records.grades.map((g, i) => {
                          const maxGrade = Number(g.max_grade);
                          const pct = maxGrade ? Math.round((Number(g.grade_value) / maxGrade) * 100) : 0;
                          return (
                            <tr key={g.id} style={{ background: i % 2 === 0 ? t.tableRowEven : t.tableRowOdd, borderTop: `1px solid ${t.cardBorder}` }}>
                              <td className={`px-4 py-3 font-bold ${t.heading}`}>{g.subject?.name || "-"}</td>
                              <td className={`px-4 py-3 ${t.subheading}`}>{g.teacher?.name || "-"}</td>
                              <td className={`px-4 py-3 ${t.heading}`}>{g.type}</td>
                              <td className={`px-4 py-3 font-semibold ${t.heading}`}>{g.grade_value}/{g.max_grade} ({pct}%)</td>
                              <td className={`px-4 py-3 ${t.subheading}`}>{g.date}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h4 className={`font-bold mb-3 ${t.heading}`}>Attendance Records</h4>
                  <div className="rounded-2xl overflow-auto" style={{ border: `1px solid ${t.cardBorder}`, background: t.cardBg }}>
                    <table className="w-full text-sm min-w-[620px]">
                      <thead><tr style={{ background: t.tableHeadBg }}>{["Date", "Status", "Teacher"].map(h => <th key={h} className={`px-4 py-3 text-left text-xs font-bold uppercase ${t.label}`}>{h}</th>)}</tr></thead>
                      <tbody>
                        {records.attendance.length === 0 ? <tr><td colSpan={3} className={`px-4 py-8 text-center ${t.subheading}`}>No attendance records found.</td></tr> : records.attendance.map((a, i) => (
                          <tr key={a.id} style={{ background: i % 2 === 0 ? t.tableRowEven : t.tableRowOdd, borderTop: `1px solid ${t.cardBorder}` }}>
                            <td className={`px-4 py-3 font-bold ${t.heading}`}>{a.date}</td>
                            <td className={`px-4 py-3 ${t.heading}`}>{a.status}</td>
                            <td className={`px-4 py-3 ${t.subheading}`}>{a.teacher?.name || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="relative mb-4">
        <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" />
        <input
          type="text"
          placeholder="Search by name, email, or class"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none ${t.inputText} ${t.inputPlaceholder}`}
          style={{ background: t.fieldBg, border: `1px solid ${t.fieldBorder}`, color: t.fieldText }}
        />
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${t.cardBorder}`, background: t.cardBg }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: t.tableHeadBg }}>
              {["Name", "Email", "Current Class", ""].map(h => (
                <th key={h} className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${t.label}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className={`px-4 py-10 text-center ${t.subheading}`}>No students found.</td></tr>
            ) : filtered.map((s, i) => (
              <tr key={s.user_id} style={{ background: i % 2 === 0 ? t.tableRowEven : t.tableRowOdd, borderTop: `1px solid ${t.cardBorder}` }}>
                <td className={`px-4 py-3 font-bold ${t.heading}`}>{s.profile.name}</td>
                <td className={`px-4 py-3 font-medium ${t.subheading}`}>{s.profile.email}</td>
                <td className={`px-4 py-3 font-semibold ${t.heading}`}>{s.class?.name || "No class"}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => loadRecords(s)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium mr-2"
                    style={{ background: "rgba(8,145,178,0.15)", color: "#0891b2", border: "1px solid rgba(8,145,178,0.3)" }}>Records</button>
                  <button onClick={() => setMoving({ userId: s.user_id, name: s.profile.name, currentClass: s.class?.name || "No class", classId: s.class?.id })}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: "rgba(99,102,241,0.15)", color: "#4f46e5", border: "1px solid rgba(99,102,241,0.3)" }}>Move</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={`text-xs mt-3 ${t.subheading}`}>{filtered.length} student{filtered.length !== 1 ? "s" : ""} shown</p>
    </div>
  );
}

function AnnouncementsView({ t }) {
  const [tab, setTab] = useState("send");
  const [target, setTarget] = useState("all");
  const [selectedRole, setSelectedRole] = useState("student");
  const [form, setForm] = useState({ title: "", content: "", date: "" });
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [sent, setSent] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [loading, setLoading] = useState(false);
  const [histLoading, setHistLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const inputClass = `w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200 ${t.inputText} ${t.inputPlaceholder}`;
  const ROLES = ["student", "parent", "teacher"];
  const TARGET_OPTS = [
    { id: "all", label: "All Users", icon: "🌐" },
    { id: "role", label: "By Role", icon: "👥" },
    { id: "specific", label: "Specific Users", icon: "🎯" },
  ];

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API}/manager/users`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } catch {}
  }, []);

  const loadSent = useCallback(async () => {
    setHistLoading(true);
    try {
      const res = await fetch(`${API}/manager/announcements/sent`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setSent(data.announcements);
    } catch {
      setMsg({ type: "error", text: "Failed to load sent announcements." });
    }
    setHistLoading(false);
  }, []);

  const loadInbox = useCallback(async () => {
    setHistLoading(true);
    try {
      const res = await fetch(`${API}/manager/announcements/inbox`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setInbox(data.announcements);
    } catch {
      setMsg({ type: "error", text: "Failed to load admin announcements." });
    }
    setHistLoading(false);
  }, []);

  useEffect(() => {
    if (target === "specific") loadUsers();
  }, [target, loadUsers]);

  useEffect(() => {
    if (tab === "history") loadSent();
    if (tab === "inbox") loadInbox();
  }, [tab, loadSent, loadInbox]);

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  const toggleUser = (user) => {
    setSelectedUsers(prev => prev.some(u => u.id === user.id) ? prev.filter(u => u.id !== user.id) : [...prev, user]);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const body = { ...form, target };
      if (target === "role") body.role = selectedRole;
      if (target === "specific") body.user_ids = selectedUsers.map(u => u.id);

      const res = await fetch(`${API}/manager/announcements`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: "success", text: `Sent to ${data.recipient_count} recipient${data.recipient_count !== 1 ? "s" : ""}.` });
        setForm({ title: "", content: "", date: "" });
        setSelectedUsers([]);
        setSearch("");
      } else {
        setMsg({ type: "error", text: data.message || "Failed to send." });
      }
    } catch {
      setMsg({ type: "error", text: "Server error." });
    }
    setLoading(false);
  };

  const deleteAnnouncement = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    try {
      const res = await fetch(`${API}/manager/announcements/${id}`, { method: "DELETE", headers: authHeaders() });
      const data = await res.json();
      if (data.success) setSent(prev => prev.filter(a => a.id !== id));
    } catch {}
  };

  const renderAnnouncementList = (items, emptyText, canDelete = false) => {
    if (histLoading) return <div className="flex justify-center py-16"><Spinner /></div>;
    if (!items.length) return <div className={`text-center py-16 ${t.subheading}`}>{emptyText}</div>;
    return (
      <div className="space-y-4">
        {items.map(a => (
          <div key={a.id} className="rounded-2xl p-5" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-base ${t.heading}`}>{a.title}</p>
                <p className={`text-sm mt-1 whitespace-pre-wrap ${t.subheading}`}>{a.content}</p>
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <span className={`text-xs ${t.subheading}`}>{a.date}</span>
                  {a.sender && <Badge tone="danger">From {a.sender.name}</Badge>}
                  {a.receivers && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                      style={{ background: "rgba(99,102,241,0.15)", color: "#4f46e5", border: "1px solid rgba(99,102,241,0.3)" }}>
                      {a.receivers?.length ?? 0} recipient{(a.receivers?.length ?? 0) !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
              {canDelete && (
                <button onClick={() => deleteAnnouncement(a.id)}
                  className="p-1.5 rounded-lg text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
                  style={{ background: "rgba(239,68,68,0.1)" }}
                  title="Delete announcement">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className={`text-xl font-bold mb-1 ${t.heading}`}>Announcements</h2>
        <p className={`text-sm ${t.subheading}`}>Broadcast messages to parents, students, and teachers, or read announcements from admin.</p>
      </div>

      <div className="flex gap-2 mb-6">
        {[
          ["send", "Send New"],
          ["history", "Sent History"],
          ["inbox", "From Admin"],
        ].map(([id, label]) => (
          <button key={id} onClick={() => { setTab(id); setMsg(null); }}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150"
            style={tab === id
              ? { background: "linear-gradient(135deg,#0891b2,#6366f1)", color: "#fff" }
              : { background: t.inputBg, color: t.navText, border: `1px solid ${t.inputBorder}` }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "send" && (
        <div className="max-w-2xl">
          <form onSubmit={handleSend} className="space-y-5">
          <div className="rounded-xl p-5 space-y-4"
            style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)" }}>
            <p className="text-indigo-400 text-xs font-semibold uppercase tracking-wider">Send To</p>
            <div className="flex flex-wrap gap-2">
              {TARGET_OPTS.map(opt => (
                <button key={opt.id} type="button"
                  onClick={() => { setTarget(opt.id); setSelectedUsers([]); setSearch(""); }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150"
                  style={target === opt.id
                    ? { background: "linear-gradient(135deg,#0891b2,#6366f1)", color: "#fff" }
                    : { background: t.inputBg, color: t.navText, border: `1px solid ${t.inputBorder}` }}>
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>

            {target === "role" && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${t.label}`}>Role</label>
                <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: t.fieldBg, color: t.fieldText, border: `1px solid ${t.fieldBorder}` }}>
                  {ROLES.map(r => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}s
                    </option>
                  ))}
                </select>
              </div>
            )}

            {target === "specific" && (
              <div className="space-y-3">
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map(u => (
                      <span key={u.id} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                        style={{ background: t.badgeBg, color: t.fieldText, border: `1px solid ${t.listItemBorder}` }}>
                        {u.name}
                        <button type="button" onClick={() => toggleUser(u)} className="hover:opacity-70 leading-none text-base">x</button>
                      </span>
                    ))}
                  </div>
                )}
                <input placeholder="Search by name or email..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  className={inputClass}
                  style={{ background: t.fieldBg, border: `1px solid ${t.fieldBorder}`, color: t.fieldText }} />
                <div className="max-h-48 overflow-y-auto rounded-xl"
                  style={{ border: `1px solid ${t.fieldBorder}` }}>
                  {filteredUsers.length === 0 ? (
                    <p className={`text-sm text-center py-4 ${t.subheading}`}>No users found.</p>
                  ) : filteredUsers.map(u => {
                    const chosen = selectedUsers.some(s => s.id === u.id);
                    return (
                      <button key={u.id} type="button" onClick={() => toggleUser(u)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors"
                        style={{ background: chosen ? t.activeListBg : t.listItemBg, borderBottom: `1px solid ${t.listItemBorder}` }}>
                        <div>
                          <span className={`font-medium ${t.heading}`}>{u.name}</span>
                          <span className={`ml-2 text-xs ${t.subheading}`}>{u.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge tone="neutral">{u.role}</Badge>
                          {chosen && <span className="font-bold text-xs" style={{ color: t.activeText }}>Selected</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {selectedUsers.length > 0 && (
                  <p className={`text-xs ${t.subheading}`}>{selectedUsers.length} user{selectedUsers.length !== 1 ? "s" : ""} selected</p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl p-5 space-y-4"
            style={{ background: "rgba(8,145,178,0.06)", border: "1px solid rgba(8,145,178,0.2)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#0891b2" }}>Message Content</p>
            <div>
              <label className={`block text-sm font-medium mb-2 ${t.label}`}>Title</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required
                placeholder="e.g. School Holiday Notice"
                className={inputClass} style={{ background: t.fieldBg, border: `1px solid ${t.fieldBorder}`, color: t.fieldText }}
                onFocus={e => (e.target.style.border = "1px solid #6366f1")}
                onBlur={e => (e.target.style.border = `1px solid ${t.fieldBorder}`)} />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${t.label}`}>Message</label>
              <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required
                rows={4} placeholder="Write your announcement here..."
                className={`${inputClass} resize-none`}
                style={{ background: t.fieldBg, border: `1px solid ${t.fieldBorder}`, color: t.fieldText }}
                onFocus={e => (e.target.style.border = "1px solid #6366f1")}
                onBlur={e => (e.target.style.border = `1px solid ${t.fieldBorder}`)} />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${t.label}`}>Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required
                className={inputClass}
                style={{ background: t.fieldBg, border: `1px solid ${t.fieldBorder}`, color: t.fieldText }}
                onFocus={e => (e.target.style.border = "1px solid #6366f1")}
                onBlur={e => (e.target.style.border = `1px solid ${t.fieldBorder}`)} />
            </div>
          </div>

          <Alert msg={msg} onClose={() => setMsg(null)} />

          <button type="submit" disabled={loading || (target === "specific" && selectedUsers.length === 0)}
            className="w-full py-3 px-4 rounded-xl font-semibold text-white text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #0891b2, #6366f1)" }}>
            {loading ? <><Spinner /> Sending...</> : "Send Announcement"}
          </button>
          </form>
        </div>
      )}

      {tab === "history" && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={loadSent}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 flex items-center gap-2"
              style={{ background: t.inputBg, color: t.navText, border: `1px solid ${t.inputBorder}` }}>
              Refresh
            </button>
          </div>
          {renderAnnouncementList(sent, "No announcements sent yet.", true)}
        </div>
      )}

      {tab === "inbox" && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={loadInbox}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 flex items-center gap-2"
              style={{ background: t.inputBg, color: t.navText, border: `1px solid ${t.inputBorder}` }}>
              Refresh
            </button>
          </div>
          {renderAnnouncementList(inbox, "No announcements from admin yet.")}
        </div>
      )}
    </div>
  );
}

function ReportsView({ t, onNavigate }) {
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("incomplete");

  useEffect(() => {
    fetch(`${API}/manager/reports/classes`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (d.success) setReport(d.report); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    all: report.length,
    complete: report.filter(c => c.total_subjects > 0 && c.assigned_subjects === c.total_subjects).length,
    incomplete: report.filter(c => c.total_subjects > 0 && c.assigned_subjects < c.total_subjects).length,
    empty: report.filter(c => c.total_subjects === 0).length,
  };

  const filtered = report.filter(cls => {
    if (filter === "complete") return cls.total_subjects > 0 && cls.assigned_subjects === cls.total_subjects;
    if (filter === "incomplete") return cls.total_subjects > 0 && cls.assigned_subjects < cls.total_subjects;
    if (filter === "empty") return cls.total_subjects === 0;
    return true;
  });

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;

  return (
    <div>
      <h2 className={`text-2xl font-bold mb-1 ${t.heading}`}>Setup Report</h2>
      <p className={`text-sm mb-6 ${t.subheading}`}>See which classes still need subjects or teachers.</p>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[
          ["all", "Total Classes", "#4f46e5"],
          ["complete", "Fully Set Up", "#16a34a"],
          ["incomplete", "Need Teacher", "#ea580c"],
          ["empty", "No Subjects", "#dc2626"],
        ].map(([key, label, color]) => (
          <button key={key} onClick={() => setFilter(key)}
            className="rounded-xl p-4 text-left transition-all hover:scale-[1.01]"
            style={{ background: t.cardBg, border: filter === key ? `1px solid ${color}` : `1px solid ${t.cardBorder}` }}>
            <p className="text-2xl font-bold mb-1" style={{ color }}>{counts[key]}</p>
            <p className={`text-xs ${t.subheading}`}>{label}</p>
          </button>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${t.cardBorder}`, background: t.cardBg }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: t.tableHeadBg }}>
              {["Class", "Students", "Coverage", "Subjects", "Action"].map(h => (
                <th key={h} className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${t.label}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className={`px-4 py-10 text-center ${t.subheading}`}>No classes in this category.</td></tr>
            ) : filtered.map((cls, i) => {
              const isEmpty = cls.total_subjects === 0;
              const isComplete = !isEmpty && cls.assigned_subjects === cls.total_subjects;
              const pct = isEmpty ? 0 : Math.round((cls.assigned_subjects / cls.total_subjects) * 100);
              const tone = isEmpty ? "danger" : isComplete ? "good" : "warn";
              const barColor = isEmpty ? "#dc2626" : isComplete ? "#16a34a" : "#ea580c";

              return (
                <tr key={cls.id} style={{ background: i % 2 === 0 ? t.tableRowEven : t.tableRowOdd, borderTop: `1px solid ${t.cardBorder}` }}>
                  <td className={`px-4 py-3 font-bold ${t.heading}`}>{cls.name}</td>
                  <td className={`px-4 py-3 font-semibold ${t.heading}`}>{cls.student_count}</td>
                  <td className="px-4 py-3 w-44">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 rounded-full h-1.5" style={{ background: t.inputBorder }}>
                        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                      </div>
                      <span className="text-xs w-8 text-right" style={{ color: barColor }}>{pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={tone}>{isEmpty ? "No subjects" : `${cls.assigned_subjects}/${cls.total_subjects}`}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => onNavigate("setup", cls.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: "rgba(99,102,241,0.15)", color: "#4f46e5", border: "1px solid rgba(99,102,241,0.3)" }}>
                      Set Up
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Manager({ onLogout }) {
  const [view, setView] = useState("dashboard");
  const [dark, setDark] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [setupClassId, setSetupClassId] = useState(null);
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
    activeText: "#ecfeff",
    badgeBg: "#0f172a",
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
    activeText: "#0f172a",
    badgeBg: "#e2e8f0",
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
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "setup", icon: "🏫", label: "Class Assignments" },
    { id: "students", icon: "🎓", label: "Students" },
    { id: "announcements", icon: "📢", label: "Announcements" },
    { id: "reports", icon: "📈", label: "Reports" },
  ];

  const handleNavigate = (navId, classId = null) => {
    setView(navId);
    setSetupClassId(classId);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen flex transition-colors duration-300" style={{ background: t.pageBg }}>
      {sidebarOpen && <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col p-4 transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        style={{ background: t.sidebarBg, borderRight: `1px solid ${t.sidebarBorder}`, backdropFilter: "blur(20px)" }}>
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ background: "linear-gradient(135deg,#0891b2,#6366f1)" }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 14l6.16-3.422A12.083 12.083 0 0121 17.5c0 .5-.04.99-.118 1.468M12 14l-6.16-3.422A12.083 12.083 0 003 17.5c0 .5.04.99.118 1.468" />
            </svg>
          </div>
          <div>
            <p className={`text-sm font-bold ${t.heading}`}>Manager Portal</p>
            <p className={`text-xs ${t.subheading}`}>School Management</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {nav.map(item => (
            <button key={item.id} onClick={() => handleNavigate(item.id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
              style={view === item.id
                ? { background: "linear-gradient(135deg,rgba(8,145,178,0.2),rgba(99,102,241,0.2))", color: "#22d3ee", border: "1px solid rgba(34,211,238,0.2)" }
                : { color: t.navText, border: "1px solid transparent" }}>
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${t.sidebarBorder}` }}>
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: "linear-gradient(135deg,#0891b2,#6366f1)" }}>
              {user.name?.[0]?.toUpperCase() || "M"}
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-semibold truncate ${t.heading}`}>{user.name || "Manager"}</p>
              <p className={`text-xs truncate ${t.subheading}`}>Manager</p>
            </div>
          </div>
          <button onClick={onLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 transition-all"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <Icon name="logout" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${t.sidebarBorder}`, background: t.sidebarBg, backdropFilter: "blur(12px)" }}>
          <button className="lg:hidden p-2 rounded-lg" style={{ background: t.inputBg, color: t.navText }} onClick={() => setSidebarOpen(true)}>
            <Icon name="menu" className="w-5 h-5" />
          </button>
          <p className={`text-sm font-semibold ${t.heading}`}>{nav.find(n => n.id === view)?.label}</p>
          <button onClick={() => setDark(!dark)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${t.toggleIcon}`}
            style={{ background: t.toggleBg, border: `1px solid ${t.toggleBorder}` }}>
            <Icon name={dark ? "sun" : "moon"} />
          </button>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          {view === "dashboard" && <DashboardView t={t} onNavigate={handleNavigate} />}
          {view === "setup" && <ClassSetupView t={t} initialClassId={setupClassId} key={setupClassId || "setup"} />}
          {view === "students" && <StudentsView t={t} />}
          {view === "announcements" && <AnnouncementsView t={t} />}
          {view === "reports" && <ReportsView t={t} onNavigate={handleNavigate} />}
        </main>
      </div>
    </div>
  );
}
