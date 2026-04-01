import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

const TOKEN_KEY = "aegis_token";
const PUBLIC_PATHS = ["/login"];

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/secrets", label: "Secrets" },
  { to: "/audit", label: "Audit Trail" },
  { to: "/access", label: "Access Control" },
  { to: "/vault", label: "Vault" }
];

const isPublicPath = (pathname: string) => PUBLIC_PATHS.some((path) => pathname.startsWith(path));

export const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  const onPublicRoute = isPublicPath(location.pathname);

  useEffect(() => {
    if (!token && !onPublicRoute) {
      navigate("/login", { replace: true, state: { from: location.pathname } });
    }
  }, [navigate, location.pathname, token, onPublicRoute]);

  if (!token && !onPublicRoute) {
    return null;
  }

  return (
    <div className="min-h-screen grid grid-cols-[260px_1fr] bg-slate-950 text-white">
      <aside className="border-r border-slate-800 p-6 flex flex-col gap-10">
        <div>
          <p className="uppercase tracking-[0.4em] text-xs text-slate-400">Project</p>
          <h1 className="text-2xl font-semibold mt-2">Aegis</h1>
        </div>
        <nav className="flex flex-col gap-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg transition-colors ${isActive ? "bg-slate-800 text-accent" : "text-slate-300 hover:bg-slate-900"}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto text-xs text-slate-500">
          Zero Trust Secrets Ops · {new Date().getFullYear()}
        </div>
      </aside>
      <main className="p-10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <Outlet />
      </main>
    </div>
  );
};
