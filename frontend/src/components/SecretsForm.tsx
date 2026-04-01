import { useState } from "react";
import { SecretAPI } from "../services/api";

type SecretsFormProps = {
  onStored?: () => void;
};

const categories = [
  { label: "API Key", value: "API_KEY" },
  { label: "Database", value: "DATABASE" },
  { label: "SSH", value: "SSH_KEY" }
];

export const SecretsForm = ({ onStored }: SecretsFormProps) => {
  const [form, setForm] = useState({ name: "", category: "API_KEY", secret_value: "" });
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await SecretAPI.store(form);
      setMessage("Secret encrypted & stored in Vault");
      setForm({ ...form, secret_value: "" });
      onStored?.();
    } catch (error) {
      setMessage("Unable to store secret (auth required)");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        className="w-full rounded-xl bg-slate-900 border border-slate-800 px-4 py-3"
        placeholder="Name (e.g. prod-stripe-key)"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        required
      />
      <select
        className="w-full rounded-xl bg-slate-900 border border-slate-800 px-4 py-3"
        value={form.category}
        onChange={(e) => setForm({ ...form, category: e.target.value })}
      >
        {categories.map((category) => (
          <option key={category.value} value={category.value}>
            {category.label}
          </option>
        ))}
      </select>
      <textarea
        className="w-full rounded-xl bg-slate-900 border border-slate-800 px-4 py-3"
        placeholder="Secret value"
        rows={4}
        value={form.secret_value}
        onChange={(e) => setForm({ ...form, secret_value: e.target.value })}
        required
      />
      <button className="w-full bg-accent text-slate-950 rounded-xl py-3 font-semibold" type="submit">
        Store Secret
      </button>
      {message && <p className="text-sm text-success">{message}</p>}
    </form>
  );
};
