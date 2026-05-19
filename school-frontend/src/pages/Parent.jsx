import { useCallback, useEffect, useMemo, useState } from "react";

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
    menu:   "M4 6h16M4 12h16M4 18h16",
    logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
    sun:    "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z",
    moon:   "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z",
  };
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={icons[name]} />
    </svg>
  );
}

function Badge({ children, tone = "neutral" }) {
  const styles = {
    good:    { background: "rgba(34,197,94,0.16)",  color: "#16a34a", border: "1px solid rgba(34,197,94,0.34)"  },
    warn:    { background: "rgba(249,115,22,0.16)", color: "#ea580c", border: "1px solid rgba(249,115,22,0.34)" },
    danger:  { background: "rgba(239,68,68,0.16)",  color: "#dc2626", border: "1px solid rgba(239,68,68,0.34)"  },
    neutral: { background: "rgba(99,102,241,0.16)", color: "#4f46e5", border: "1px solid rgba(99,102,241,0.34)" },
  };
  return <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={styles[tone]}>{children}</span>;
}

function StatCard({ t, label, value, note, color, icon }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-2xl">{icon}</span>
        <span className="text-2xl font-bold" style={{ color }}>{value}</span>
      </div>
      <p className={`text-sm font-semibold ${t.heading}`}>{label}</p>
      <p className={`text-xs mt-1 ${t.subheading}`}>{note}</p>
    </div>
  );
}

function statusTone(status) {
  if (status === "Present") return "good";
  if (status === "Late" || status === "Excused") return "warn";
  if (status === "Absent") return "danger";
  return "neutral";
}

function gradeTone(pct) {
  if (pct >= 80) return "good";
  if (pct >= 60) return "warn";
  return "danger";
}

export default function Parent({ onLogout }) {
  const [data, setData]           = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading]     = useState(true);
  const [msg, setMsg]             = useState(null);
  const [dark, setDark]           = useState(() => localStorage.getItem("parent-theme") !== "light");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");

  const t = dark ? {
    pageBg:         "#0b1120",
    sidebarBg:      "#111827",
    sidebarBorder:  "rgba(148,163,184,0.22)",
    cardBg:         "#111827",
    cardBorder:     "rgba(148,163,184,0.24)",
    heading:        "text-white",
    subheading:     "text-slate-300",
    label:          "text-slate-200",
    inputBg:        "#1f2937",
    inputBorder:    "rgba(148,163,184,0.28)",
    navText:        "#cbd5e1",
    toggleBg:       "rgba(255,255,255,0.07)",
    toggleBorder:   "rgba(255,255,255,0.12)",
    toggleIcon:     "text-yellow-300",
    tableHeadBg:    "#1e293b",
    tableRowEven:   "#111827",
    tableRowOdd:    "#1f2937",
    selectColor:    "#f8fafc",
  } : {
    pageBg:         "#e2e8f0",
    sidebarBg:      "#ffffff",
    sidebarBorder:  "#cbd5e1",
    cardBg:         "#ffffff",
    cardBorder:     "#cbd5e1",
    heading:        "text-slate-900",
    subheading:     "text-slate-500",
    label:          "text-slate-700",
    inputBg:        "#f1f5f9",
    inputBorder:    "#94a3b8",
    navText:        "#334155",
    toggleBg:       "#e2e8f0",
    toggleBorder:   "#94a3b8",
    toggleIcon:     "text-slate-600",
    tableHeadBg:    "#e2e8f0",
    tableRowEven:   "#ffffff",
    tableRowOdd:    "#f8fafc",
    selectColor:    "#0f172a",
  };

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res  = await fetch(`${API}/parent/overview`, { headers: authHeaders() });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to load parent dashboard.");
      setData(json);
      setSelectedId(cur => cur || json.children?.[0]?.user_id || null);
    } catch (err) {
      setMsg(err.message || "Failed to load parent dashboard.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { localStorage.setItem("parent-theme", dark ? "dark" : "light"); }, [dark]);

  const selectedChild = useMemo(
    () => data?.children?.find(c => c.user_id === selectedId) || data?.children?.[0] || null,
    [data, selectedId]
  );

  const nav = [
    { id: "overview",      icon: "🏠", label: "Overview"      },
    { id: "marks",         icon: "📊", label: "All Marks"     },
    { id: "attendance",    icon: "📅", label: "Attendance"    },
    { id: "announcements", icon: "🔔", label: "Announcements" },
  ];

  const activeLabel = nav.find(n => n.id === activeTab)?.label || "";

  const Sidebar = () => (
    <div className="flex flex-col h-full py-6 px-4"
      style={{ background: t.sidebarBg, borderRight: `1px solid ${t.sidebarBorder}` }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#0891b2,#6366f1)" }}>
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <p className={`text-sm font-bold ${t.heading}`}>Parent Portal</p>
          <p className={`text-xs ${t.subheading}`}>School Management</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {nav.map(item => (
          <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
            style={activeTab === item.id
              ? { background: "linear-gradient(135deg,rgba(8,145,178,0.2),rgba(99,102,241,0.2))", color: "#22d3ee", border: "1px solid rgba(34,211,238,0.2)" }
              : { color: t.navText, border: "1px solid transparent" }}>
            <span className="text-base flex-shrink-0">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* User + logout */}
      <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${t.sidebarBorder}` }}>
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#0891b2,#6366f1)" }}>
            {user.name?.[0]?.toUpperCase() || "P"}
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-medium truncate ${t.heading}`}>{user.name || "Parent"}</p>
            <p className={`text-xs ${t.subheading}`}>Parent</p>
          </div>
        </div>
        <button onClick={onLogout}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 transition-all"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <Icon name="logout" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex transition-colors duration-300" style={{ background: t.pageBg }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 flex-shrink-0 transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        <div className="h-full overflow-y-auto">
          <Sidebar />
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${t.sidebarBorder}`, background: t.sidebarBg, backdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 rounded-lg" style={{ background: t.inputBg, color: t.navText }}
              onClick={() => setSidebarOpen(true)}>
              <Icon name="menu" className="w-5 h-5" />
            </button>
            <p className={`text-sm font-semibold ${t.heading}`}>{activeLabel}</p>
          </div>
          <button onClick={() => setDark(!dark)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${t.toggleIcon}`}
            style={{ background: t.toggleBg, border: `1px solid ${t.toggleBorder}` }}>
            <Icon name={dark ? "sun" : "moon"} />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-auto">
          {msg && (
            <div className="rounded-xl p-4 mb-5 text-sm text-red-400"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
              {msg}
            </div>
          )}

          {loading ? (
            <div className={`min-h-[55vh] flex items-center justify-center ${t.heading}`}><Spinner /></div>
          ) : activeTab !== "announcements" && !selectedChild ? (
            <div className="rounded-2xl p-10 text-center" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
              <p className="text-3xl mb-3">👨‍👩‍👧</p>
              <h2 className={`text-xl font-bold ${t.heading}`}>No Children Found</h2>
              <p className={`text-sm mt-2 ${t.subheading}`}>This parent account is not linked to any student yet.</p>
            </div>
          ) : (
            <>
              {/* Page header */}
              <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-6">
                <div>
                  <p className={`text-sm font-semibold ${t.label}`}>
                    {activeTab === "announcements" ? "Inbox" : "Children"}
                  </p>
                  <h2 className={`text-2xl font-bold mt-1 ${t.heading}`}>
                    {activeTab === "announcements" ? "Announcements" : selectedChild.profile?.name}
                  </h2>
                  <p className={`text-sm mt-1 ${t.subheading}`}>
                    {activeTab === "announcements"
                      ? "Messages sent directly to your parent account."
                      : `${selectedChild.profile?.email} | ${selectedChild.class?.name || "No class"}`}
                  </p>
                </div>
                {activeTab !== "announcements" && data?.children?.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    {data.children.map(child => (
                      <button key={child.user_id} onClick={() => setSelectedId(child.user_id)}
                        className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                        style={selectedChild.user_id === child.user_id
                          ? { background: "linear-gradient(135deg,#0891b2,#6366f1)", color: "#fff" }
                          : { background: t.inputBg, color: t.navText, border: `1px solid ${t.inputBorder}` }}>
                        {child.profile?.name || `Student ${child.user_id}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ── OVERVIEW ── */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <StatCard t={t} label="Grade Average" value={`${selectedChild.summaries.grades.percentage}%`}
                      note={`${selectedChild.summaries.grades.earned}/${selectedChild.summaries.grades.possible} total marks`} color="#4f46e5" icon="📊" />
                    <StatCard t={t} label="Grade Records" value={selectedChild.summaries.grades.count}
                      note={`${selectedChild.summaries.grades.exams} exams, ${selectedChild.summaries.grades.quizzes} quizzes`} color="#0891b2" icon="📋" />
                    <StatCard t={t} label="Attendance" value={`${selectedChild.summaries.attendance.percentage}%`}
                      note={`${selectedChild.summaries.attendance.present}/${selectedChild.summaries.attendance.total} days present`} color="#16a34a" icon="📅" />
                    <StatCard t={t} label="Absent / Late" value={`${selectedChild.summaries.attendance.absent}/${selectedChild.summaries.attendance.late}`}
                      note="absence and late records" color="#ea580c" icon="⚠️" />
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <section className="rounded-2xl p-5" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
                      <h3 className={`font-bold mb-4 ${t.heading}`}>Subjects & Teachers</h3>
                      <div className="space-y-3">
                        {selectedChild.subjects.length === 0 ? (
                          <p className={`text-sm ${t.subheading}`}>No subjects assigned yet.</p>
                        ) : selectedChild.subjects.map(s => (
                          <div key={`${s.subject_id}-${s.teacher_id}`} className="rounded-xl p-4"
                            style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}` }}>
                            <p className={`font-bold ${t.heading}`}>{s.subject_name}</p>
                            <p className={`text-sm mt-1 ${t.subheading}`}>
                              {s.teacher_name || "No teacher assigned"}{s.teacher_email ? ` | ${s.teacher_email}` : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-2xl p-5" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
                      <h3 className={`font-bold mb-4 ${t.heading}`}>Latest Announcements</h3>
                      <div className="space-y-3">
                        {(data.announcements || []).slice(0, 4).length === 0 ? (
                          <p className={`text-sm ${t.subheading}`}>No announcements received.</p>
                        ) : data.announcements.slice(0, 4).map(item => (
                          <div key={item.id} className="rounded-xl p-4"
                            style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}` }}>
                            <div className="flex items-start justify-between gap-3">
                              <p className={`font-bold ${t.heading}`}>{item.title}</p>
                              <Badge>{item.sender?.role || "school"}</Badge>
                            </div>
                            <p className={`text-sm mt-2 ${t.subheading}`}>{item.content}</p>
                            <p className={`text-xs mt-3 ${t.label}`}>{item.sender?.name || "School"} | {item.date}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>
              )}

              {/* ── ALL MARKS ── */}
              {activeTab === "marks" && (
                <section className="rounded-2xl overflow-hidden" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
                  <div className="p-5 flex items-center justify-between gap-4" style={{ background: t.tableHeadBg }}>
                    <div>
                      <h3 className={`font-bold ${t.heading}`}>All Marks</h3>
                      <p className={`text-sm mt-1 ${t.subheading}`}>Exam, quiz, and homework details with teacher and subject.</p>
                    </div>
                    <Badge tone={gradeTone(selectedChild.summaries.grades.percentage)}>
                      {selectedChild.summaries.grades.percentage}% average
                    </Badge>
                  </div>
                  <div className="overflow-auto">
                    <table className="w-full text-sm min-w-[720px]">
                      <thead>
                        <tr style={{ background: t.tableHeadBg }}>
                          {["Subject", "Teacher", "Type", "Mark", "Date"].map(h => (
                            <th key={h} className={`px-5 py-3 text-left text-xs font-bold uppercase tracking-wider ${t.label}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedChild.grades || []).length === 0 ? (
                          <tr><td colSpan={5} className={`px-5 py-10 text-center ${t.subheading}`}>No marks found.</td></tr>
                        ) : (selectedChild.grades || []).map((g, i) => (
                          <tr key={g.id} style={{ background: i % 2 === 0 ? t.tableRowEven : t.tableRowOdd, borderTop: `1px solid ${t.cardBorder}` }}>
                            <td className={`px-5 py-3 font-bold ${t.heading}`}>{g.subject_name || "Subject"}</td>
                            <td className={`px-5 py-3 ${t.subheading}`}>{g.teacher_name || "Teacher"}</td>
                            <td className="px-5 py-3"><Badge>{g.type}</Badge></td>
                            <td className={`px-5 py-3 font-bold ${t.heading}`}>
                              {g.grade_value}/{g.max_grade} <span className={t.subheading}>({g.percentage}%)</span>
                            </td>
                            <td className={`px-5 py-3 ${t.subheading}`}>{g.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* ── ATTENDANCE ── */}
              {activeTab === "attendance" && (
                <section className="rounded-2xl overflow-hidden" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
                  <div className="p-5 flex items-center justify-between gap-4" style={{ background: t.tableHeadBg }}>
                    <div>
                      <h3 className={`font-bold ${t.heading}`}>Attendance Records</h3>
                      <p className={`text-sm mt-1 ${t.subheading}`}>Full history with the teacher who saved each record.</p>
                    </div>
                    <Badge tone={selectedChild.summaries.attendance.percentage >= 80 ? "good" : "warn"}>
                      {selectedChild.summaries.attendance.percentage}% present
                    </Badge>
                  </div>
                  <div className="overflow-auto">
                    <table className="w-full text-sm min-w-[620px]">
                      <thead>
                        <tr style={{ background: t.tableHeadBg }}>
                          {["Date", "Status", "Teacher", "Email"].map(h => (
                            <th key={h} className={`px-5 py-3 text-left text-xs font-bold uppercase tracking-wider ${t.label}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedChild.attendance || []).length === 0 ? (
                          <tr><td colSpan={4} className={`px-5 py-10 text-center ${t.subheading}`}>No attendance records found.</td></tr>
                        ) : (selectedChild.attendance || []).map((a, i) => (
                          <tr key={a.id} style={{ background: i % 2 === 0 ? t.tableRowEven : t.tableRowOdd, borderTop: `1px solid ${t.cardBorder}` }}>
                            <td className={`px-5 py-3 font-bold ${t.heading}`}>{a.date}</td>
                            <td className="px-5 py-3"><Badge tone={statusTone(a.status)}>{a.status}</Badge></td>
                            <td className={`px-5 py-3 ${t.subheading}`}>{a.teacher_name || "Teacher"}</td>
                            <td className={`px-5 py-3 ${t.subheading}`}>{a.teacher_email || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* ── ANNOUNCEMENTS ── */}
              {activeTab === "announcements" && (
                <section className="rounded-2xl p-5" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
                  <h3 className={`font-bold mb-4 ${t.heading}`}>Announcements Inbox</h3>
                  <div className="space-y-3">
                    {(data.announcements || []).length === 0 ? (
                      <p className={`text-sm ${t.subheading}`}>No announcements received.</p>
                    ) : data.announcements.map(item => (
                      <div key={item.id} className="rounded-xl p-4"
                        style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}` }}>
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div>
                            <p className={`font-bold ${t.heading}`}>{item.title}</p>
                            <p className={`text-xs mt-1 ${t.subheading}`}>
                              {item.sender?.name || "School"} | {item.sender?.role || "staff"} | {item.date}
                            </p>
                          </div>
                          <Badge>{item.sender?.role || "school"}</Badge>
                        </div>
                        <p className={`text-sm mt-3 ${t.subheading}`}>{item.content}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
