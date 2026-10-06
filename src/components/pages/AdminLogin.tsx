import { useState } from "react";
import { useAdminAuth } from "../../hooks/useAdminAuth";
import { Lock, Mail, AlertCircle } from "lucide-react";

export default function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const { login } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gold mb-2">
            Local Guide
          </h1>
          <p className="text-gray-400">Admin Panel</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/5 border border-gold/20 rounded-2xl p-8 space-y-5"
        >
          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-2">Email</label>
            <div className="relative">
              <Mail
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-label="Admin email"
                autoComplete="username"
                className="w-full bg-navy border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:border-gold focus:outline-none"
                placeholder="admin@localguide.app"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Password</label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-label="Admin password"
                autoComplete="current-password"
                className="w-full bg-navy border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:border-gold focus:outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold text-navy font-bold py-3 rounded-lg hover:bg-gold/90 transition disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          Guests see the app. Admins manage POIs.
        </p>
      </div>
    </div>
  );
}
