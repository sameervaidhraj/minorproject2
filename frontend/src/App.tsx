import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { SecretsManager } from "./pages/SecretsManager";
import { AuditTrail } from "./pages/AuditTrail";
import { AccessControl } from "./pages/AccessControl";
import { VaultControl } from "./pages/VaultControl";
import { Login } from "./pages/Login";

const App = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route element={<Layout />}>
      <Route path="/" element={<Dashboard />} />
      <Route path="/secrets" element={<SecretsManager />} />
      <Route path="/audit" element={<AuditTrail />} />
      <Route path="/access" element={<AccessControl />} />
      <Route path="/vault" element={<VaultControl />} />
    </Route>
  </Routes>
);

export default App;
