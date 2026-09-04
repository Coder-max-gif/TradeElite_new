import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useStore } from "@/state/store";
import { 
  Lock, 
  User, 
  ArrowRight, 
  ShieldCheck, 
  ChevronLeft,
  AlertCircle,
  Eye,
  EyeOff
} from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useStore();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Artificial delay for realism
    await new Promise(resolve => setTimeout(resolve, 800));

    const validCredentials: Record<string, string> = {
      "140830": "Krishna@14",
      "250912": "Hitesh@1408",
      "020726": "Vishal@0207",
      "140526": "Divyani@1405",
      "160326": "Hitesh@1603",
      "011025": "Bharat@0110",
      "030226": "Susheel@0302",
      "310826": "Client@3108",
      "010826": "Suyojit@0108",
    };

    if (validCredentials[userId] && password === validCredentials[userId]) {
      login(userId);
      navigate({ to: "/dashboard" });
    } else {
      setError("Invalid credentials. Please check your ID and password.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-4 py-20 sm:py-4 relative overflow-hidden pt-safe pb-safe">
      {/* Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 blur-[120px] rounded-full -z-10" />
      
      <Link 
        to="/" 
        className="absolute top-5 left-4 sm:top-8 sm:left-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
      >
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Home
      </Link>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-7 sm:mb-10">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <span className="text-primary-foreground font-bold text-lg">FX</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome Back</h1>
          <p className="text-muted-foreground mt-2 text-sm">Access your TradeElite elite terminal</p>
        </div>

        <div className="glass-panel p-5 sm:p-8 rounded-3xl border border-white/5 shadow-2xl relative">
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3 text-destructive"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-xs font-medium leading-relaxed">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">User ID</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                  <User className="w-4 h-4" />
                </div>
                <input 
                  type="text"
                  inputMode="numeric"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter your ID"
                  required
                  className="w-full bg-muted/50 border border-border rounded-xl py-3.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Password</label>
                <button type="button" className="text-[10px] font-bold text-primary hover:underline">Forgot Password?</button>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <input 
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-muted/50 border border-border rounded-xl py-3.5 pl-11 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-1">
              <input type="checkbox" id="remember" className="rounded border-border bg-muted/50 text-primary focus:ring-primary/20" />
              <label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer">Remember this device</label>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group shadow-lg shadow-primary/20 disabled:opacity-50 disabled:scale-100"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  Sign In to Terminal
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 sm:mt-8 sm:pt-8 border-t border-border/50 text-center">
            <p className="text-xs text-muted-foreground">
              Don't have an account? 
              <Link to="/" className="text-primary font-bold ml-1 hover:underline">Start Free Evaluation</Link>
            </p>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-6 text-muted-foreground/40">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tighter">
            <ShieldCheck className="w-3 h-3" />
            SECURE SSL
          </div>
          <div className="w-1 h-1 rounded-full bg-border" />
          <div className="text-[10px] font-bold uppercase tracking-tighter">
            © 2024 TradeElite
          </div>
        </div>
      </motion.div>
    </div>
  );
}
