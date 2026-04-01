import { AxiosError } from "axios";
import { FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthAPI } from "../services/api";

const inputStyles = "w-full rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3 text-white focus:border-accent focus:outline-none";

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? "/";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!username || !password) {
      setError("Enter both username and password");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { data } = await AuthAPI.login({ username, password });
      localStorage.setItem("aegis_token", data.access_token);
      localStorage.setItem("aegis_refresh", data.refresh_token);
      navigate(from, { replace: true });
    } catch (err) {
      const detail = err instanceof AxiosError ? err.response?.data?.detail : null;
      setError(detail ?? "Invalid credentials or rate limit hit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Project</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Aegis Console</h1>
          <p className="text-sm text-slate-400">Zero Trust Secrets Operations</p>
        </div>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm text-slate-400">Username</label>
            <input
              className={inputStyles}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400">Password</label>
            <input
              type="password"
              className={inputStyles}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent px-4 py-3 font-semibold text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Securing..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
};
