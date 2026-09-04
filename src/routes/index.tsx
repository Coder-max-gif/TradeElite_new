import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  BarChart3, 
  Globe, 
  Shield, 
  Zap, 
  TrendingUp, 
  Users, 
  BookOpen, 
  LifeBuoy,
  ChevronDown,
  Layout
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2 px-safe">
          <div className="flex items-center gap-4 lg:gap-8 min-w-0">
            <Link to="/" className="flex items-center gap-2 group min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center group-hover:rotate-6 transition-transform">
                <span className="text-primary-foreground font-bold text-sm">FX</span>
              </div>
              <span className="text-foreground font-bold text-lg sm:text-xl tracking-tight truncate">TradeElite</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-6">
              {['Trading', 'Platform', 'Learning', 'Support'].map((item) => (
                <button key={item} className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                  {item} <ChevronDown className="w-3 h-3" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <Link to="/login" className="text-sm font-medium hover:text-primary transition-colors">
              Login
            </Link>
            <Link 
              to="/login" 
              className="px-3.5 sm:px-5 py-2 rounded-full bg-primary text-primary-foreground text-xs sm:text-sm font-bold hover:bg-primary/90 transition-all hover:scale-105 whitespace-nowrap"
            >
              Open Account
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-28 pb-14 sm:pt-32 sm:pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Image Overlay */}
        <div className="absolute inset-0 -z-20">
          <img 
            src="https://images.unsplash.com/photo-1611974717484-2874120016a7?q=80&w=2070&auto=format&fit=crop" 
            alt="Market Background" 
            className="w-full h-full object-cover opacity-[0.03] grayscale"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
        </div>

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/10 blur-[120px] rounded-full -z-10 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 relative">
          {/* Floating Images for Desktop */}
          <div className="hidden xl:block">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="absolute -left-20 top-20 w-64 h-80 rounded-3xl overflow-hidden border border-white/10 shadow-2xl rotate-[-6deg] hover:rotate-0 transition-transform duration-500"
            >
              <img 
                src="https://images.unsplash.com/photo-1614028674026-a65e31bfd27c?q=80&w=2070&auto=format&fit=crop" 
                alt="Mobile Trading" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                <p className="text-white text-xs font-bold">Trade on the go</p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7, duration: 1 }}
              className="absolute -right-20 top-40 w-64 h-80 rounded-3xl overflow-hidden border border-white/10 shadow-2xl rotate-[6deg] hover:rotate-0 transition-transform duration-500"
            >
              <img 
                src="https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=2070&auto=format&fit=crop" 
                alt="Pro Desk" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                <p className="text-white text-xs font-bold">Institutional Tools</p>
              </div>
            </motion.div>
          </div>

          <div className="text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20 tracking-wider uppercase mb-6 inline-block">
                Premium Funded Trading
              </span>
              <h1 className="text-[2rem] leading-[1.12] sm:text-5xl lg:text-7xl font-extrabold tracking-tight mb-5 sm:mb-6 bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent leading-[1.1]">
                Trade the world's <br />
                <span className="text-primary">financial markets</span>
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed">
                Experience professional trading with high-leverage, deep liquidity, and a platform built for elite performance. Join 1M+ traders worldwide.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link 
                  to="/login" 
                  className="w-full sm:w-auto px-8 py-4 rounded-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all hover:scale-105 flex items-center justify-center gap-2 group"
                >
                  Start Trading Now
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <button className="w-full sm:w-auto px-8 py-4 rounded-full border border-border bg-muted/50 font-bold hover:bg-muted transition-all">
                  Try Demo Account
                </button>
              </div>
            </motion.div>
          </div>

          {/* Platform Preview */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mt-20 relative mx-auto max-w-5xl group"
          >
            <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full -z-10 group-hover:bg-primary/30 transition-all duration-700" />
            <div className="glass-panel p-2 rounded-[2rem] border border-white/10 shadow-2xl">
              <div className="bg-background rounded-[1.5rem] overflow-hidden border border-white/5 aspect-[16/9] relative group-hover:scale-[1.01] transition-transform duration-700">
                <img 
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop" 
                  alt="Dashboard Preview" 
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center backdrop-blur-sm border border-white/10 animate-pulse">
                    <Layout className="w-10 h-10 text-primary" />
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent flex items-end justify-start p-8">
                  <div className="text-left">
                    <p className="text-sm font-bold text-primary mb-1">TradeElite Terminal</p>
                    <p className="text-2xl font-bold">The most advanced web-based trading interface</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 border-y border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { label: 'Traders', value: '1.2M+' },
            { label: 'Trading Volume', value: '$45B+' },
            { label: 'Avg execution', value: '< 20ms' },
            { label: 'Assets', value: '1000+' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl lg:text-4xl font-black text-primary mb-2">{stat.value}</p>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold mb-4">Why Choose TradeElite?</h2>
          <p className="text-muted-foreground">The ultimate platform for serious traders.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { 
              icon: Zap, 
              title: "Instant Execution", 
              desc: "Get your orders filled at the best market prices with zero delay and deep liquidity." 
            },
            { 
              icon: Shield, 
              title: "Regulated & Secure", 
              desc: "Your funds are held in segregated accounts with industry-leading security protocols." 
            },
            { 
              icon: BarChart3, 
              title: "Advanced Analytics", 
              desc: "Built-in technical indicators, real-time sentiment, and institutional-grade charting." 
            },
          ].map((feature) => (
            <div key={feature.title} className="glass-panel p-8 rounded-3xl border border-white/5 hover:border-primary/30 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-[10px]">FX</span>
            </div>
            <span className="text-foreground font-bold text-lg">TradeElite</span>
          </div>
          
          <div className="flex gap-8 text-sm text-muted-foreground">
            <button className="hover:text-primary transition-colors">Privacy Policy</button>
            <button className="hover:text-primary transition-colors">Terms of Service</button>
            <button className="hover:text-primary transition-colors">Risk Disclosure</button>
          </div>

          <p className="text-xs text-muted-foreground/60">
            © 2024 TradeElite. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
