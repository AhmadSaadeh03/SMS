// src/pages/Login.jsx
import { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [dark, setDark] = useState(true);

  const t = dark
    ? {
        // Dark mode
        outerBg: "bg-slate-950",
        rightBg: "linear-gradient(160deg, #0f172a 0%, #0d1f35 60%, #0f172a 100%)",
        blob1: "rgba(99,102,241,0.08)",
        blob2: "rgba(8,145,178,0.07)",
        blob3: "rgba(99,102,241,0.04)",
        cardBg: "rgba(15,23,42,0.8)",
        cardBorder: "rgba(255,255,255,0.08)",
        heading: "text-white",
        subheading: "text-slate-400",
        label: "text-slate-300",
        inputBg: "rgba(255,255,255,0.05)",
        inputBorder: "rgba(255,255,255,0.1)",
        inputText: "text-white",
        inputPlaceholder: "placeholder-slate-500",
        inputIcon: "text-slate-500",
        eyeIcon: "text-slate-500 hover:text-slate-300",
        footerText: "text-slate-600",
        footerLink: "text-cyan-600",
        copyright: "text-slate-700",
        toggleBg: "rgba(255,255,255,0.07)",
        toggleBorder: "rgba(255,255,255,0.12)",
        toggleIcon: "text-yellow-300",
      }
    : {
        // Light mode
        outerBg: "bg-slate-100",
        rightBg: "linear-gradient(160deg, #f1f5f9 0%, #e2eaf5 60%, #f1f5f9 100%)",
        blob1: "rgba(99,102,241,0.07)",
        blob2: "rgba(8,145,178,0.06)",
        blob3: "rgba(99,102,241,0.04)",
        cardBg: "rgba(255,255,255,0.85)",
        cardBorder: "rgba(0,0,0,0.08)",
        heading: "text-slate-900",
        subheading: "text-slate-500",
        label: "text-slate-700",
        inputBg: "rgba(0,0,0,0.04)",
        inputBorder: "rgba(0,0,0,0.12)",
        inputText: "text-slate-900",
        inputPlaceholder: "placeholder-slate-400",
        inputIcon: "text-slate-400",
        eyeIcon: "text-slate-400 hover:text-slate-600",
        footerText: "text-slate-500",
        footerLink: "text-cyan-600",
        copyright: "text-slate-400",
        toggleBg: "rgba(0,0,0,0.06)",
        toggleBorder: "rgba(0,0,0,0.1)",
        toggleIcon: "text-slate-700",
      };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
        sessionStorage.setItem("token", data.token);
        sessionStorage.setItem("user", JSON.stringify(data.user));
        window.dispatchEvent(new Event("auth-change"));
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Server error. Try again later.");
    }

    setLoading(false);
  };

  return (
    <div className={`min-h-screen flex ${t.outerBg} transition-colors duration-300`}>
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col items-center justify-center p-12"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0e7490 100%)" }}>
        {/* Decorative circles */}
        <div className="absolute top-[-80px] left-[-80px] w-72 h-72 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #22d3ee, transparent)" }} />
        <div className="absolute bottom-[-60px] right-[-60px] w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #6366f1, transparent)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #ffffff, transparent)" }} />

        {/* Logo */}
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-2xl flex items-center justify-center mb-8 shadow-2xl"
            style={{ background: "linear-gradient(135deg, #0891b2, #6366f1)" }}>
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
            </svg>
          </div>

          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
            School Management
          </h1>
          <p className="text-cyan-300 text-lg font-medium mb-2">System</p>
          <p className="text-slate-400 text-sm max-w-xs leading-relaxed mt-4">
            A unified platform for administrators, teachers, students, and parents to manage academic operations efficiently.
          </p>

          {/* Feature pills */}
          <div className="mt-10 flex flex-col gap-3 w-full max-w-xs">
            {[
              { icon: "👩‍🏫", label: "Teacher & Staff Management" },
              { icon: "📚", label: "Course & Grade Tracking" },
              { icon: "📊", label: "Reports & Analytics" },
            ].map((item) => (
              <div key={item.label}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-slate-300"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="text-base">{item.icon}</span>
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative overflow-hidden transition-all duration-300"
        style={{ background: t.rightBg }}>
        {/* Decorative blobs */}
        <div className="absolute top-[-100px] right-[-100px] w-80 h-80 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${t.blob1}, transparent 70%)` }} />
        <div className="absolute bottom-[-80px] left-[-80px] w-72 h-72 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${t.blob2}, transparent 70%)` }} />
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${t.blob3}, transparent 70%)` }} />

        {/* Theme toggle */}
        <button
          onClick={() => setDark(!dark)}
          className={`absolute top-5 right-5 z-20 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${t.toggleIcon}`}
          style={{ background: t.toggleBg, border: `1px solid ${t.toggleBorder}` }}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? (
            /* Sun icon */
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          ) : (
            /* Moon icon */
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #0891b2, #6366f1)" }}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <span className={`font-bold text-xl ${t.heading}`}>School Management</span>
          </div>

          {/* Card */}
          <div className="rounded-2xl p-8 transition-all duration-300"
            style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, backdropFilter: "blur(20px)" }}>
            <div className="mb-8">
              <h2 className={`text-2xl font-bold mb-1 transition-colors duration-300 ${t.heading}`}>Welcome back</h2>
              <p className={`text-sm transition-colors duration-300 ${t.subheading}`}>Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="email" className={`block text-sm font-medium mb-2 transition-colors duration-300 ${t.label}`}>
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className={`w-4 h-4 transition-colors duration-300 ${t.inputIcon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    placeholder="name@school.com"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all duration-200 ${t.inputText} ${t.inputPlaceholder}`}
                    style={{
                      background: t.inputBg,
                      border: `1px solid ${t.inputBorder}`,
                    }}
                    onFocus={e => e.target.style.border = "1px solid #0891b2"}
                    onBlur={e => e.target.style.border = `1px solid ${t.inputBorder}`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className={`block text-sm font-medium mb-2 transition-colors duration-300 ${t.label}`}>
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className={`w-4 h-4 transition-colors duration-300 ${t.inputIcon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none transition-all duration-200 ${t.inputText} ${t.inputPlaceholder}`}
                    style={{
                      background: t.inputBg,
                      border: `1px solid ${t.inputBorder}`,
                    }}
                    onFocus={e => e.target.style.border = "1px solid #0891b2"}
                    onBlur={e => e.target.style.border = `1px solid ${t.inputBorder}`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className={`absolute inset-y-0 right-0 pr-3.5 flex items-center transition-colors ${t.eyeIcon}`}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
                  <svg className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-semibold text-white text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                style={{ background: "linear-gradient(135deg, #0891b2, #6366f1)" }}
                onMouseEnter={e => !loading && (e.target.style.opacity = "0.9")}
                onMouseLeave={e => (e.target.style.opacity = "1")}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <p className={`mt-6 text-center text-xs transition-colors duration-300 ${t.footerText}`}>
              Need access?{" "}
              <span className={t.footerLink}>Contact IT support</span>
            </p>
          </div>

          <p className={`text-center text-xs mt-6 transition-colors duration-300 ${t.copyright}`}>
            &copy; {new Date().getFullYear()} School Management System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
