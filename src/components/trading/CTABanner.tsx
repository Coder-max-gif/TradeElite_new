import { motion } from "framer-motion";

export function CTABanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="relative overflow-hidden rounded-xl p-6 shimmer-gold"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent rounded-xl" />
      <div className="relative flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-bold text-primary glow-gold">
            Turn $10,000 into $150,000
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Join 10,000+ profitable traders worldwide
          </p>
          <p className="text-xs text-loss font-medium mt-2 animate-pulse-slow">
            ⚡ Limited Spots Available
          </p>
        </div>
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow"
          >
            Start Trading Now
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3 rounded-lg border border-primary/40 text-primary font-bold text-sm hover:bg-primary/10 transition-colors"
          >
            Join 10,000+ Traders
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
