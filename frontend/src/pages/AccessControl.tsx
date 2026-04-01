import { useEffect, useState } from "react";
import { AuthAPI } from "../services/api";
import { Card } from "../components/Card";

export const AccessControl = () => {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    AuthAPI.users()
      .then((response) => setUsers(response.data))
      .catch(() => setUsers([]));
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-slate-500">RBAC • MFA • Device Trust</p>
        <h2 className="text-3xl font-semibold">Identity Perimeter</h2>
      </header>
      <Card title="User Registry" accent={`${users.length} identities`}>
        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-500 uppercase tracking-widest text-xs">
              <tr>
                <th className="py-3 px-4 text-left">User</th>
                <th className="py-3 px-4 text-left">Role</th>
                <th className="py-3 px-4 text-left">Last Login IP</th>
                <th className="py-3 px-4 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="odd:bg-slate-900/40">
                  <td className="py-3 px-4 font-medium">{user.username}</td>
                  <td className="py-3 px-4 text-slate-300">{user.role}</td>
                  <td className="py-3 px-4 text-slate-400">{user.last_login_ip ?? "—"}</td>
                  <td className="py-3 px-4 text-slate-400">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
