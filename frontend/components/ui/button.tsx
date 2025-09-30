import { ButtonHTMLAttributes, forwardRef } from 'react'
import { motion, type MotionProps } from 'framer-motion'

type NativeButtonProps = ButtonHTMLAttributes<HTMLButtonElement>

export type ButtonProps = Omit<NativeButtonProps, keyof MotionProps> & MotionProps & {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', ...props }, ref) => {
    const base = 'inline-flex items-center justify-center rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'
    const sizes = size === 'sm' ? 'px-3 py-1 text-sm' : 'px-4 py-2'
    const variants =
      variant === 'primary'
        ? 'bg-[var(--primary)] text-white hover:opacity-90 focus:ring-[var(--primary)]'
        : variant === 'secondary'
        ? 'bg-gray-200 text-gray-900 border border-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 hover:opacity-90'
        : 'bg-transparent text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
    return (
      <motion.button
        ref={ref}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className={`${base} ${sizes} ${variants} ${className}`}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'


