import { useState } from "react";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import { Button, Input, Label } from "@repo/ui";
import { signIn } from "@repo/store";

interface LoginProps {
  onLogin: () => void;
  authError?: string | null;
  onRetry?: () => void;
}

const Login = ({ onLogin, authError, onRetry }: LoginProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const displayError = error || authError || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");

    const result = await signIn(email, password);

    if (result.success) {
      onLogin();
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-8 px-6">
        <div className="flex flex-col items-center">
          <img src="/images/zh-logo.png" alt="Logo" className="h-24 w-24 object-contain mb-2" />
          <div className="text-center">
            <h1 className="text-4xl font-normal text-foreground"
              style={{ fontFamily: "'Italianno', cursive" }}>
              ZenHouse Cafe
            </h1>
            <p className="mt-1 text-sm text-muted-foreground uppercase tracking-[0.2em] font-bold">Admin Portal</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              className="h-11 rounded-xl shadow-sm"
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                className="h-11 rounded-xl pr-10 shadow-sm"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {displayError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 space-y-2">
              <p className="text-sm text-destructive font-medium">{displayError}</p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="flex items-center gap-1.5 text-xs font-semibold text-destructive underline-offset-2 hover:underline"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry connection
                </button>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 rounded-xl text-sm font-bold uppercase tracking-widest shadow-lg shadow-primary/20"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
