import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import Teacher from "./pages/Teacher";
import Manager from "./pages/Manager";
import Parent from "./pages/Parent";
import Student from "./pages/Student";

function App() {
  const [token, setToken] = useState(sessionStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("user")); } catch { return null; }
  });

  useEffect(() => {
    const sync = () => {
      setToken(sessionStorage.getItem("token"));
      try { setUser(JSON.parse(sessionStorage.getItem("user"))); } catch { setUser(null); }
    };
    window.addEventListener("auth-change", sync);
    return () => window.removeEventListener("auth-change", sync);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    setToken(null);
    setUser(null);
    window.dispatchEvent(new Event("auth-change"));
  };

  if (token && user) {
    if (user.role === "teacher") return <Teacher onLogout={handleLogout} />;
    if (user.role === "manager") return <Manager onLogout={handleLogout} />;
    if (user.role === "parent")  return <Parent  onLogout={handleLogout} />;
    if (user.role === "student") return <Student onLogout={handleLogout} />;
    return <Admin onLogout={handleLogout} />;
  }
  return <Login />;
}

export default App;
