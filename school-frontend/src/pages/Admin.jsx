// src/pages/Admin.jsx
import { useState, useEffect, useCallback } from "react";

const API = "http://localhost:5000";

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${sessionStorage.getItem("token")}`,
  };
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

// ─── Alert ────────────────────────────────────────────────────────────────────
function Alert({ msg }) {
  if (!msg) return null;
  const ok = msg.type === "success";
  return (
    <div className="flex items-start gap-2.5 p-3.5 rounded-xl"
      style={ok
        ? { background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)" }
        : { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
      <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${ok ? "text-green-400" : "text-red-400"}`}
        fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {ok
          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
      </svg>
      <p className={`text-sm ${ok ? "text-green-400" : "text-red-400"}`}>{msg.text}</p>
    </div>
  );
}

// ─── Role badge ───────────────────────────────────────────────────────────────
const ROLE_COLORS = {
  admin:   { bg: "rgba(239,68,68,0.15)",   text: "#f87171", border: "rgba(239,68,68,0.3)" },
  manager: { bg: "rgba(249,115,22,0.15)",  text: "#fb923c", border: "rgba(249,115,22,0.3)" },
  teacher: { bg: "rgba(99,102,241,0.15)",  text: "#818cf8", border: "rgba(99,102,241,0.3)" },
  student: { bg: "rgba(34,197,94,0.15)",   text: "#4ade80", border: "rgba(34,197,94,0.3)" },
  parent:  { bg: "rgba(8,145,178,0.15)",   text: "#22d3ee", border: "rgba(8,145,178,0.3)" },
};
function RoleBadge({ role }) {
  const c = ROLE_COLORS[role] || ROLE_COLORS.admin;
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      {role}
    </span>
  );
}

function ManagerScopeBadge({ scope }) {
  if (!scope) return null;
  const label = scope === "grades_8_12" ? "Grades 8-12" : "Grades 1-7";
  return (
    <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: "rgba(249,115,22,0.15)", color: "#fb923c", border: "1px solid rgba(249,115,22,0.3)" }}>
      {label}
    </span>
  );
}

// ─── Sidebar nav item ─────────────────────────────────────────────────────────
function NavItem({ icon, label, active, onClick, t }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left`}
      style={active
        ? { background: "linear-gradient(135deg,rgba(8,145,178,0.2),rgba(99,102,241,0.2))", color: "#22d3ee", border: "1px solid rgba(34,211,238,0.2)" }
        : { color: t.navText, border: "1px solid transparent" }}>
      <span className="text-base flex-shrink-0">{icon}</span>
      {label}
    </button>
  );
}

// ─── Field component (outside AddUserView to prevent focus loss on re-render) ──
function Field({ label, name, type = "text", placeholder, required = true, form, onChange, inputClass, inputStyle, inputBorder }) {
  return (
    <div>
      <label className={`block text-sm font-medium mb-2 ${inputStyle.labelClass}`}>{label}</label>
      <input name={name} type={type} placeholder={placeholder}
        className={inputClass} style={{ background: inputStyle.bg, border: `1px solid ${inputBorder}` }}
        onFocus={e => (e.target.style.border = "1px solid #6366f1")}
        onBlur={e => (e.target.style.border = `1px solid ${inputBorder}`)}
        value={form[name] || ""}
        onChange={e => onChange(name, e.target.value)}
        required={required} />
    </div>
  );
}

// ─── Add User Form ─────────────────────────────────────────────────────────────
function AddUserView({ t }) {
  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState({});
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    fetch(`${API}/admin/classes`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => { if (data.success) setClasses(data.classes); })
      .catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const inputClass = `w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200 ${t.inputText} ${t.inputPlaceholder}`;
  const inputStyle = { bg: t.inputBg, labelClass: t.label };
  const fieldProps = { form, onChange: set, inputClass, inputStyle, inputBorder: t.inputBorder };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const body = { ...form, role };

      const res  = await fetch(`${API}/admin/users`, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: "success", text: `${role.charAt(0).toUpperCase() + role.slice(1)} added successfully!` });
        setForm({});
      } else {
        setMsg({ type: "error", text: data.message || "Failed to add user." });
      }
    } catch {
      setMsg({ type: "error", text: "Server error. Try again later." });
    }
    setLoading(false);
  };

  const ROLES = ["student", "teacher", "manager", "admin"];

  return (
    <div className="max-w-xl">
      <h2 className={`text-xl font-bold mb-1 ${t.heading}`}>Add New User</h2>
      <p className={`text-sm mb-6 ${t.subheading}`}>Select a role, then fill in the required details.</p>

      {/* Role selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {ROLES.map(r => (
          <button key={r} type="button"
            onClick={() => { setRole(r); setForm({}); setMsg(null); }}
            className="px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all duration-150"
            style={role === r
              ? { background: "linear-gradient(135deg,#0891b2,#6366f1)", color: "#fff" }
              : { background: t.inputBg, color: t.navText, border: `1px solid ${t.inputBorder}` }}>
            {r}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Common fields */}
        <div className="rounded-xl p-5 space-y-4"
          style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)" }}>
          <p className="text-indigo-400 text-xs font-semibold uppercase tracking-wider capitalize">{role} Info</p>
          <Field label="Full Name"      name="name"     placeholder="e.g. Ahmed Hassan" {...fieldProps} />
          <Field label="Email Address"  name="email"    type="email" placeholder="user@school.com" {...fieldProps} />
          <Field label="Password"       name="password" type="password" placeholder="••••••••" {...fieldProps} />
        </div>

        {/* Student extras */}
        {role === "student" && (
          <div className="rounded-xl p-5 space-y-4"
            style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <p className="text-green-400 text-xs font-semibold uppercase tracking-wider">Student Details</p>
            <div>
              <label className={`block text-sm font-medium mb-2 ${t.label}`}>Class & Section</label>
              <select
                value={form.class_id || ""}
                onChange={e => set("class_id", e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                style={{ background: t.selectBg, color: t.selectText, border: `1px solid ${t.inputBorder}` }}
                onFocus={e => (e.target.style.border = "1px solid #6366f1")}
                onBlur={e => (e.target.style.border = `1px solid ${t.inputBorder}`)}>
                <option value="" style={{ background: t.selectBg, color: t.selectText }}>-- Select a class --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id} style={{ background: t.selectBg, color: t.selectText }}>
                    Grade {c.grade_level} — Section {c.section}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-1 border-t" style={{ borderColor: "rgba(34,197,94,0.2)" }}>
              <p className="text-green-400 text-xs font-semibold uppercase tracking-wider mb-4">Parent Info</p>
              <p className={`text-xs mb-3 ${t.subheading}`}>Enter an existing parent's email, or leave blank to create a new parent account.</p>
              <div className="space-y-4">
                <Field label="Existing Parent Email (optional)" name="existingParentEmail" type="email" placeholder="parent@school.com" required={false} {...fieldProps} />
                {!form.existingParentEmail && (
                  <>
                    <Field label="Parent Full Name"  name="parentName"     placeholder="e.g. Hassan Ali" {...fieldProps} />
                    <Field label="Parent Email"      name="parentEmail"    type="email" placeholder="parent@email.com" {...fieldProps} />
                    <Field label="Parent Password"   name="parentPassword" type="password" placeholder="••••••••" {...fieldProps} />
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {role === "manager" && (
          <div className="rounded-xl p-5 space-y-4"
            style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.2)" }}>
            <p className="text-orange-400 text-xs font-semibold uppercase tracking-wider">Manager Grade Range</p>
            <div>
              <label className={`block text-sm font-medium mb-2 ${t.label}`}>Responsible Grades</label>
              <select
                value={form.manager_scope || ""}
                onChange={e => set("manager_scope", e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                style={{ background: t.selectBg, color: t.selectText, border: `1px solid ${t.inputBorder}` }}>
                <option value="" style={{ background: t.selectBg, color: t.selectText }}>-- Select grade range --</option>
                <option value="grades_1_7" style={{ background: t.selectBg, color: t.selectText }}>Grades 1 to 7</option>
                <option value="grades_8_12" style={{ background: t.selectBg, color: t.selectText }}>Grades 8 to 12</option>
              </select>
            </div>
          </div>
        )}


        <Alert msg={msg} />

        <button type="submit" disabled={loading}
          className="w-full py-3 px-4 rounded-xl font-semibold text-white text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #0891b2, #6366f1)" }}>
          {loading ? <><Spinner /> Adding...</> : `Add ${role.charAt(0).toUpperCase() + role.slice(1)}`}
        </button>
      </form>
    </div>
  );
}

// ─── User Details Modal ────────────────────────────────────────────────────────
function UserDetailsModal({ user, t, onClose }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    const urls = {
      student: `${API}/admin/students/${user.id}`,
      parent:  `${API}/admin/parents/${user.id}/children`,
      teacher: `${API}/admin/teachers/${user.id}`,
    };
    fetch(urls[user.role], { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d); else setError(d.message); })
      .catch(() => setError("Failed to load details."))
      .finally(() => setLoading(false));
  }, [user]);

  const row = (label, value) => (
    <div className="flex justify-between items-center py-2" style={{ borderBottom: `1px solid ${t.cardBorder}` }}>
      <span className={`text-xs font-semibold uppercase tracking-wide ${t.subheading}`}>{label}</span>
      <span className={`text-sm font-medium ${t.heading}`}>{value || "—"}</span>
    </div>
  );

  const renderContent = () => {
    if (loading) return <div className="flex justify-center py-8"><Spinner /></div>;
    if (error)   return <p className="text-red-400 text-sm text-center py-8">{error}</p>;

    if (user.role === "student") {
      const s = data.student;
      return (
        <div className="space-y-1">
          {row("Name",    s.profile?.name)}
          {row("Email",   s.profile?.email)}
          {row("Grade",   s.class ? `Grade ${s.class.grade_level}` : null)}
          {row("Section", s.class?.section)}
          {row("Parent",  s.parent?.name)}
          {row("Parent Email", s.parent?.email)}
        </div>
      );
    }

    if (user.role === "parent") {
      const children = data.children;
      if (children.length === 0) return <p className={`text-sm text-center py-8 ${t.subheading}`}>No children linked.</p>;
      return (
        <div className="space-y-3">
          {children.map(c => (
            <div key={c.id} className="rounded-xl p-4 space-y-1" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}` }}>
              {row("Name",    c.profile?.name)}
              {row("Email",   c.profile?.email)}
              {row("Grade",   c.class ? `Grade ${c.class.grade_level}` : null)}
              {row("Section", c.class?.section)}
            </div>
          ))}
        </div>
      );
    }

    if (user.role === "teacher") {
      const classes = data.teacher.Classes;
      if (!classes || classes.length === 0) return <p className={`text-sm text-center py-8 ${t.subheading}`}>No classes assigned yet.</p>;
      return (
        <div className="space-y-2">
          {classes.map(c => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}` }}>
              <span className={`text-sm font-medium ${t.heading}`}>Grade {c.grade_level}</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }}>
                Section {c.section}
              </span>
            </div>
          ))}
        </div>
      );
    }
  };

  const titles = { student: "Student Details", parent: "Parent's Children", teacher: "Assigned Classes" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-5" style={{ background: t.sidebarBg, border: `1px solid ${t.cardBorder}` }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-lg font-bold ${t.heading}`}>{titles[user.role]}</h3>
            <p className={`text-xs ${t.subheading}`}>{user.name}</p>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${t.subheading} hover:opacity-70`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div>{renderContent()}</div>
      </div>
    </div>
  );
}

// ─── Edit User Modal ───────────────────────────────────────────────────────────
function EditUserModal({ user, t, onClose, onSaved }) {
  const ROLES = ["student", "teacher", "parent", "manager", "admin"];
  const [form, setForm] = useState({ name: user.name, email: user.email, role: user.role, password: "", manager_scope: user.manager_scope || "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const inputClass = `w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200 ${t.inputText} ${t.inputPlaceholder}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const body = { name: form.name, email: form.email, role: form.role };
      if (form.role === "manager") body.manager_scope = form.manager_scope;
      if (form.password) body.password = form.password;

      const res  = await fetch(`${API}/admin/users/${user.id}`, { method: "PUT", headers: authHeaders(), body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) {
        onSaved(data.user);
      } else {
        setMsg({ type: "error", text: data.message || "Failed to update user." });
      }
    } catch {
      setMsg({ type: "error", text: "Server error." });
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-5" style={{ background: t.sidebarBg, border: `1px solid ${t.cardBorder}` }}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-lg font-bold ${t.heading}`}>Edit User</h3>
            <p className={`text-xs ${t.subheading}`}>ID #{user.id}</p>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${t.subheading} hover:opacity-70`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${t.label}`}>Full Name</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} required
              className={inputClass} style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}` }}
              onFocus={e => (e.target.style.border = "1px solid #6366f1")}
              onBlur={e => (e.target.style.border = `1px solid ${t.inputBorder}`)} />
          </div>

          {/* Email */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${t.label}`}>Email</label>
            <input type="email" value={form.email} onChange={e => set("email", e.target.value)} required
              className={inputClass} style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}` }}
              onFocus={e => (e.target.style.border = "1px solid #6366f1")}
              onBlur={e => (e.target.style.border = `1px solid ${t.inputBorder}`)} />
          </div>

          {/* Role */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${t.label}`}>Role</label>
            <select value={form.role} onChange={e => set("role", e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
              style={{ background: t.selectBg, color: t.selectText, border: `1px solid ${t.inputBorder}` }}
              onFocus={e => (e.target.style.border = "1px solid #6366f1")}
              onBlur={e => (e.target.style.border = `1px solid ${t.inputBorder}`)}>
              {ROLES.map(r => (
                <option key={r} value={r} style={{ background: t.selectBg, color: t.selectText }}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* New password (optional) */}
          {form.role === "manager" && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${t.label}`}>Responsible Grades</label>
              <select value={form.manager_scope || ""} onChange={e => set("manager_scope", e.target.value)} required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                style={{ background: t.selectBg, color: t.selectText, border: `1px solid ${t.inputBorder}` }}>
                <option value="" style={{ background: t.selectBg, color: t.selectText }}>-- Select grade range --</option>
                <option value="grades_1_7" style={{ background: t.selectBg, color: t.selectText }}>Grades 1 to 7</option>
                <option value="grades_8_12" style={{ background: t.selectBg, color: t.selectText }}>Grades 8 to 12</option>
              </select>
            </div>
          )}

          {/* New password (optional) */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${t.label}`}>New Password <span className={`font-normal ${t.subheading}`}>(leave blank to keep current)</span></label>
            <input type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="••••••••"
              className={inputClass} style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}` }}
              onFocus={e => (e.target.style.border = "1px solid #6366f1")}
              onBlur={e => (e.target.style.border = `1px solid ${t.inputBorder}`)} />
          </div>

          <Alert msg={msg} />

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-150"
              style={{ background: t.inputBg, color: t.navText, border: `1px solid ${t.inputBorder}` }}>
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg,#0891b2,#6366f1)" }}>
              {loading ? <><Spinner /> Saving...</> : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Users List View ───────────────────────────────────────────────────────────
function UsersView({ t }) {
  const [users, setUsers]       = useState([]);
  const [roleFilter, setFilter] = useState("all");
  const [search, setSearch]     = useState("");
  const [loading, setLoading]   = useState(true);
  const [msg, setMsg]           = useState(null);
  const [editingUser, setEditingUser]   = useState(null);
  const [detailsUser, setDetailsUser]   = useState(null);

  const TABS = ["all", "admin", "manager", "teacher", "student", "parent"];

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const url = roleFilter === "all" ? `${API}/admin/users` : `${API}/admin/users?role=${roleFilter}`;
      const res  = await fetch(url, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } catch {
      setMsg({ type: "error", text: "Failed to load users." });
    }
    setLoading(false);
  }, [roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const deleteUser = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      const res  = await fetch(`${API}/admin/users/${id}`, { method: "DELETE", headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: "success", text: `"${name}" deleted.` });
        setUsers(u => u.filter(x => x.id !== id));
      } else {
        setMsg({ type: "error", text: data.message });
      }
    } catch {
      setMsg({ type: "error", text: "Server error." });
    }
  };

  const handleSaved = (updated) => {
    setUsers(u => u.map(x => x.id === updated.id ? updated : x));
    setMsg({ type: "success", text: `"${updated.name}" updated successfully.` });
    setEditingUser(null);
  };

  const q = search.trim().toLowerCase();
  const filteredUsers = q
    ? users.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        String(u.id) === q
      )
    : users;

  return (
    <div>
      {editingUser && (
        <EditUserModal user={editingUser} t={t} onClose={() => setEditingUser(null)} onSaved={handleSaved} />
      )}
      {detailsUser && (
        <UserDetailsModal user={detailsUser} t={t} onClose={() => setDetailsUser(null)} />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`text-xl font-bold mb-1 ${t.heading}`}>Users</h2>
          <p className={`text-sm ${t.subheading}`}>{filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""} found</p>
        </div>
        <button onClick={fetchUsers}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 flex items-center gap-2"
          style={{ background: t.inputBg, color: t.navText, border: `1px solid ${t.inputBorder}` }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Role filter tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map(tab => (
          <button key={tab} onClick={() => { setFilter(tab); setSearch(""); }}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all duration-150"
            style={roleFilter === tab
              ? { background: "linear-gradient(135deg,#0891b2,#6366f1)", color: "#fff" }
              : { background: t.inputBg, color: t.navText, border: `1px solid ${t.inputBorder}` }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <svg className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${t.subheading}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
        </svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, or ID…"
          className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 ${t.inputText} ${t.inputPlaceholder}`}
          style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}` }}
          onFocus={e => (e.target.style.border = "1px solid #6366f1")}
          onBlur={e  => (e.target.style.border = `1px solid ${t.inputBorder}`)} />
        {search && (
          <button onClick={() => setSearch("")}
            className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-lg leading-none ${t.subheading} hover:opacity-70`}>
            ×
          </button>
        )}
      </div>

      <Alert msg={msg} />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className={`text-center py-16 ${t.subheading}`}>
          {search.trim() ? "No users match your search." : "No users found."}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${t.cardBorder}` }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: t.tableHeadBg }}>
                {["ID", "Name", "Email", "Role", "Created", ""].map(h => (
                  <th key={h} className={`px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider ${t.subheading}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u, i) => (
                <tr key={u.id}
                  style={{ background: i % 2 === 0 ? t.tableRowEven : t.tableRowOdd, borderTop: `1px solid ${t.cardBorder}` }}>
                  <td className={`px-4 py-3 ${t.subheading}`}>{u.id}</td>
                  <td className={`px-4 py-3 font-medium ${t.heading}`}>{u.name}</td>
                  <td className={`px-4 py-3 ${t.subheading}`}>{u.email}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={u.role} />
                    {u.role === "manager" && <ManagerScopeBadge scope={u.manager_scope} />}
                  </td>
                  <td className={`px-4 py-3 ${t.subheading}`}>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {["student", "parent", "teacher"].includes(u.role) && (
                        <button onClick={() => setDetailsUser(u)}
                          className="p-1.5 rounded-lg text-cyan-400 hover:text-cyan-300 transition-colors"
                          style={{ background: "rgba(8,145,178,0.1)" }}
                          title="View details">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      )}
                      <button onClick={() => setEditingUser(u)}
                        className="p-1.5 rounded-lg text-indigo-400 hover:text-indigo-300 transition-colors"
                        style={{ background: "rgba(99,102,241,0.1)" }}
                        title="Edit user">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => deleteUser(u.id, u.name)}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-300 transition-colors"
                        style={{ background: "rgba(239,68,68,0.1)" }}
                        title="Delete user">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Dashboard View ────────────────────────────────────────────────────────────
function DashboardView({ t }) {
  const [stats, setStats] = useState(null);
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");

  useEffect(() => {
    const roles = ["admin", "manager", "teacher", "student", "parent"];
    Promise.all(
      roles.map(r =>
        fetch(`${API}/admin/users?role=${r}`, { headers: authHeaders() })
          .then(res => res.json())
          .then(data => ({ role: r, count: data.users?.length ?? 0 }))
      )
    ).then(results => {
      const map = {};
      results.forEach(({ role, count }) => (map[role] = count));
      setStats(map);
    }).catch(() => {});
  }, []);

  const CARDS = [
    { role: "teacher", label: "Teachers",  icon: "👩‍🏫", color: "#818cf8" },
    { role: "student", label: "Students",  icon: "🎓", color: "#4ade80" },
    { role: "parent",  label: "Parents",   icon: "👨‍👩‍👧", color: "#22d3ee" },
    { role: "manager", label: "Managers",  icon: "🏫", color: "#fb923c" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className={`text-xl font-bold mb-1 ${t.heading}`}>Welcome back, {user.name}</h2>
        <p className={`text-sm ${t.subheading}`}>Here's an overview of the school system.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {CARDS.map(c => (
          <div key={c.role} className="rounded-2xl p-5"
            style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{c.icon}</span>
              <span className="text-2xl font-bold" style={{ color: c.color }}>
                {stats ? stats[c.role] : "—"}
              </span>
            </div>
            <p className={`text-sm font-medium ${t.label}`}>{c.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-6" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
        <p className={`text-sm font-semibold mb-2 ${t.label}`}>Quick Actions</p>
        <p className={`text-xs ${t.subheading}`}>Use the sidebar to manage users, add students, teachers, or other staff.</p>
      </div>
    </div>
  );
}

// ─── Announcements View ───────────────────────────────────────────────────────
function AnnouncementsView({ t }) {
  const [tab, setTab]                   = useState("send");
  const [target, setTarget]             = useState("all");
  const [selectedRole, setSelectedRole] = useState("student");
  const [form, setForm]                 = useState({ title: "", content: "", date: "" });
  const [allUsers, setAllUsers]         = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userSearch, setUserSearch]     = useState("");
  const [loading, setLoading]           = useState(false);
  const [msg, setMsg]                   = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [histLoading, setHistLoading]   = useState(false);

  useEffect(() => {
    if (target === "specific") {
      fetch(`${API}/admin/users`, { headers: authHeaders() })
        .then(r => r.json())
        .then(d => { if (d.success) setAllUsers(d.users); })
        .catch(() => {});
    }
  }, [target]);

  const fetchHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const res  = await fetch(`${API}/admin/announcements`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setAnnouncements(data.announcements);
    } catch {}
    setHistLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "history") fetchHistory();
  }, [tab, fetchHistory]);

  const handleSend = async (e) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const body = { ...form, target };
      if (target === "role")     body.role     = selectedRole;
      if (target === "specific") body.user_ids = selectedUsers.map(u => u.id);

      const res  = await fetch(`${API}/admin/announcements`, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: "success", text: `Sent to ${data.recipient_count} recipient${data.recipient_count !== 1 ? "s" : ""}.` });
        setForm({ title: "", content: "", date: "" });
        setSelectedUsers([]);
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
      const res  = await fetch(`${API}/admin/announcements/${id}`, { method: "DELETE", headers: authHeaders() });
      const data = await res.json();
      if (data.success) setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch {}
  };

  const toggleUser = (user) => {
    setSelectedUsers(prev =>
      prev.some(u => u.id === user.id) ? prev.filter(u => u.id !== user.id) : [...prev, user]
    );
  };

  const filteredUsers = allUsers.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const inputClass = `w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200 ${t.inputText} ${t.inputPlaceholder}`;
  const ROLES      = ["admin", "manager", "teacher", "student", "parent"];
  const TARGET_OPTS = [
    { id: "all",      label: "All Users",       icon: "🌐" },
    { id: "role",     label: "By Role",          icon: "👥" },
    { id: "specific", label: "Specific Users",   icon: "🎯" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className={`text-xl font-bold mb-1 ${t.heading}`}>Announcements</h2>
        <p className={`text-sm ${t.subheading}`}>Broadcast messages to any user or group in the system.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[["send", "📢 Send New"], ["history", "📋 Sent History"]].map(([id, label]) => (
          <button key={id} onClick={() => { setTab(id); setMsg(null); }}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150"
            style={tab === id
              ? { background: "linear-gradient(135deg,#0891b2,#6366f1)", color: "#fff" }
              : { background: t.inputBg, color: t.navText, border: `1px solid ${t.inputBorder}` }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Send tab ── */}
      {tab === "send" && (
        <div className="max-w-2xl">
          <form onSubmit={handleSend} className="space-y-5">

            {/* Target selector */}
            <div className="rounded-xl p-5 space-y-4"
              style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)" }}>
              <p className="text-indigo-400 text-xs font-semibold uppercase tracking-wider">Send To</p>
              <div className="flex flex-wrap gap-2">
                {TARGET_OPTS.map(opt => (
                  <button key={opt.id} type="button"
                    onClick={() => { setTarget(opt.id); setSelectedUsers([]); setUserSearch(""); }}
                    className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150"
                    style={target === opt.id
                      ? { background: "linear-gradient(135deg,#0891b2,#6366f1)", color: "#fff" }
                      : { background: t.inputBg, color: t.navText, border: `1px solid ${t.inputBorder}` }}>
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>

              {/* Role dropdown */}
              {target === "role" && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${t.label}`}>Role</label>
                  <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ background: t.selectBg, color: t.selectText, border: `1px solid ${t.inputBorder}` }}>
                    {ROLES.map(r => (
                      <option key={r} value={r} style={{ background: t.selectBg, color: t.selectText }}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}s
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* User picker */}
              {target === "specific" && (
                <div className="space-y-3">
                  {/* Selected chips */}
                  {selectedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedUsers.map(u => (
                        <span key={u.id} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                          style={{ background: "rgba(8,145,178,0.15)", color: "#22d3ee", border: "1px solid rgba(8,145,178,0.3)" }}>
                          {u.name}
                          <button type="button" onClick={() => toggleUser(u)} className="hover:opacity-70 leading-none text-base">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Search input */}
                  <input placeholder="Search by name or email…"
                    value={userSearch} onChange={e => setUserSearch(e.target.value)}
                    className={inputClass}
                    style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}` }} />
                  {/* Scrollable list */}
                  <div className="max-h-48 overflow-y-auto rounded-xl"
                    style={{ border: `1px solid ${t.inputBorder}` }}>
                    {filteredUsers.length === 0 ? (
                      <p className={`text-sm text-center py-4 ${t.subheading}`}>No users found.</p>
                    ) : filteredUsers.map(u => {
                      const isSelected = selectedUsers.some(s => s.id === u.id);
                      return (
                        <button key={u.id} type="button" onClick={() => toggleUser(u)}
                          className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors"
                          style={{
                            background: isSelected ? "rgba(8,145,178,0.1)" : "transparent",
                            borderBottom: `1px solid ${t.cardBorder}`,
                          }}>
                          <div>
                            <span className={`font-medium ${t.heading}`}>{u.name}</span>
                            <span className={`ml-2 text-xs ${t.subheading}`}>{u.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <RoleBadge role={u.role} />
                            {isSelected && <span className="text-cyan-400 font-bold text-xs">✓</span>}
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

            {/* Content fields */}
            <div className="rounded-xl p-5 space-y-4"
              style={{ background: "rgba(8,145,178,0.06)", border: "1px solid rgba(8,145,178,0.2)" }}>
              <p className="text-cyan-400 text-xs font-semibold uppercase tracking-wider">Message Content</p>
              <div>
                <label className={`block text-sm font-medium mb-2 ${t.label}`}>Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required
                  placeholder="e.g. School Holiday Notice"
                  className={inputClass} style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}` }}
                  onFocus={e => (e.target.style.border = "1px solid #6366f1")}
                  onBlur={e  => (e.target.style.border = `1px solid ${t.inputBorder}`)} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${t.label}`}>Message</label>
                <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required
                  rows={4} placeholder="Write your announcement here…"
                  className={`${inputClass} resize-none`}
                  style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}` }}
                  onFocus={e => (e.target.style.border = "1px solid #6366f1")}
                  onBlur={e  => (e.target.style.border = `1px solid ${t.inputBorder}`)} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${t.label}`}>Date</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required
                  className={inputClass}
                  style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, colorScheme: "dark" }}
                  onFocus={e => (e.target.style.border = "1px solid #6366f1")}
                  onBlur={e  => (e.target.style.border = `1px solid ${t.inputBorder}`)} />
              </div>
            </div>

            <Alert msg={msg} />

            <button type="submit"
              disabled={loading || (target === "specific" && selectedUsers.length === 0)}
              className="w-full py-3 px-4 rounded-xl font-semibold text-white text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #0891b2, #6366f1)" }}>
              {loading ? <><Spinner /> Sending…</> : "Send Announcement"}
            </button>
          </form>
        </div>
      )}

      {/* ── History tab ── */}
      {tab === "history" && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={fetchHistory}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 flex items-center gap-2"
              style={{ background: t.inputBg, color: t.navText, border: `1px solid ${t.inputBorder}` }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          {histLoading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : announcements.length === 0 ? (
            <div className={`text-center py-16 ${t.subheading}`}>No announcements sent yet.</div>
          ) : (
            <div className="space-y-4">
              {announcements.map(a => (
                <div key={a.id} className="rounded-2xl p-5"
                  style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-base ${t.heading}`}>{a.title}</p>
                      <p className={`text-sm mt-1 ${t.subheading}`}>{a.content}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        <span className={`text-xs ${t.subheading}`}>{a.date}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }}>
                          {a.receivers?.length ?? 0} recipient{(a.receivers?.length ?? 0) !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => deleteAnnouncement(a.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
                      style={{ background: "rgba(239,68,68,0.1)" }}
                      title="Delete announcement">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Admin Page ───────────────────────────────────────────────────────────
export default function Admin({ onLogout }) {
  const [view, setView] = useState("dashboard");
  const [dark, setDark] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");

  const t = dark ? {
    pageBg: "#0b1120",
    sidebarBg: "rgba(15,23,42,0.95)",
    sidebarBorder: "rgba(255,255,255,0.07)",
    cardBg: "rgba(15,23,42,0.8)",
    cardBorder: "rgba(255,255,255,0.08)",
    heading: "text-white",
    subheading: "text-slate-400",
    label: "text-slate-300",
    inputBg: "rgba(255,255,255,0.05)",
    inputBorder: "rgba(255,255,255,0.1)",
    inputText: "text-white",
    inputPlaceholder: "placeholder-slate-500",
    navText: "#94a3b8",
    toggleBg: "rgba(255,255,255,0.07)",
    toggleBorder: "rgba(255,255,255,0.12)",
    toggleIcon: "text-yellow-300",
    tableHeadBg: "rgba(255,255,255,0.03)",
    tableRowEven: "rgba(255,255,255,0.02)",
    tableRowOdd: "transparent",
    selectBg: "#1e2d45",
    selectText: "#ffffff",
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
    inputText: "text-slate-900",
    inputPlaceholder: "placeholder-slate-400",
    navText: "#334155",
    toggleBg: "#e2e8f0",
    toggleBorder: "#94a3b8",
    toggleIcon: "text-slate-600",
    tableHeadBg: "#e2e8f0",
    tableRowEven: "#ffffff",
    tableRowOdd: "#f8fafc",
    selectBg: "#f1f5f9",
    selectText: "#0f172a",
  };

  const NAV = [
    { id: "dashboard",     icon: "📊", label: "Dashboard" },
    { id: "users",         icon: "👥", label: "Users" },
    { id: "add-user",      icon: "➕", label: "Add User" },
    { id: "announcements", icon: "📢", label: "Announcements" },
  ];

  const Sidebar = () => (
    <div className="flex flex-col h-full py-6 px-4"
      style={{ background: t.sidebarBg, borderRight: `1px solid ${t.sidebarBorder}` }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #0891b2, #6366f1)" }}>
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
          </svg>
        </div>
        <div>
          <p className={`text-sm font-bold ${t.heading}`}>School Admin</p>
          <p className={`text-xs ${t.subheading}`}>Management Panel</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {NAV.map(n => (
          <NavItem key={n.id} icon={n.icon} label={n.label} t={t}
            active={view === n.id}
            onClick={() => { setView(n.id); setSidebarOpen(false); }} />
        ))}
      </nav>

      {/* User info + logout */}
      <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${t.sidebarBorder}` }}>
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #0891b2, #6366f1)" }}>
            {user.name?.[0]?.toUpperCase() || "A"}
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-medium truncate ${t.heading}`}>{user.name}</p>
            <RoleBadge role={user.role || "admin"} />
          </div>
        </div>
        <button onClick={onLogout}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 transition-all duration-150"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex" style={{ background: t.pageBg }}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col w-64 flex-shrink-0">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <Sidebar />
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="w-64 flex-shrink-0 h-full overflow-y-auto">
            <Sidebar />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4"
          style={{ background: t.sidebarBg, borderBottom: `1px solid ${t.sidebarBorder}`, backdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-3">
            {/* Hamburger (mobile) */}
            <button className="lg:hidden p-2 rounded-xl" style={{ color: t.navText }}
              onClick={() => setSidebarOpen(true)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <p className={`font-semibold capitalize ${t.heading}`}>
              {NAV.find(n => n.id === view)?.label || "Admin"}
            </p>
          </div>

          {/* Theme toggle */}
          <button onClick={() => setDark(!dark)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${t.toggleIcon}`}
            style={{ background: t.toggleBg, border: `1px solid ${t.toggleBorder}` }}>
            {dark ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-8">
          {view === "dashboard"     && <DashboardView t={t} />}
          {view === "users"         && <UsersView t={t} />}
          {view === "add-user"      && <AddUserView t={t} />}
          {view === "announcements" && <AnnouncementsView t={t} />}
        </main>
      </div>
    </div>
  );
}
