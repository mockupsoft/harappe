import { motion } from 'framer-motion';
import { Coffee } from 'lucide-react';

interface LoadingViewProps {
  message?: string;
  fullScreen?: boolean;
}

export default function LoadingView({ message = 'Demleniyor...', fullScreen = false }: LoadingViewProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${fullScreen ? 'fixed inset-0 bg-brand-cream z-50' : 'py-20'}`}>
      <div className="relative mb-6">
        {/* Steam particles */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute -top-4 left-1/2 -translate-x-1/2 w-1.5 h-4 bg-brand-primary/30 rounded-full"
            style={{ left: `${40 + i * 10}%` }}
            animate={{
              y: [-10, -30],
              opacity: [0, 0.5, 0],
              scale: [1, 1.5],
              x: [0, (i - 1) * 10],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.4,
              ease: "easeOut",
            }}
          />
        ))}
        
        {/* The "Cup" or central icon */}
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="bg-white p-7 rounded-[2.5rem] shadow-xl shadow-brand-primary/10 relative z-10"
        >
          <Coffee size={44} className="text-brand-primary" strokeWidth={1.5} />
        </motion.div>

        {/* Ring animation */}
        <motion.div
          className="absolute -inset-3 rounded-[3rem] border-2 border-brand-primary/10"
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.div
          className="absolute -inset-3 rounded-[3rem] border-2 border-brand-primary border-t-transparent border-r-transparent"
          animate={{
            rotate: -360,
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="font-display font-medium text-xs uppercase tracking-[0.4em] text-brand-dark/40"
      >
        {message}
      </motion.p>
    </div>
  );
}
