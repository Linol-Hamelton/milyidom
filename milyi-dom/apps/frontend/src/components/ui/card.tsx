import clsx from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return <div className={clsx('rounded-2xl border border-slate-200 bg-white shadow-soft', className)}>{children}</div>;
}

export function CardHeader({ children, className }: CardProps) {
  return <div className={clsx('border-b border-slate-100 px-6 py-4', className)}>{children}</div>;
}

export function CardContent({ children, className }: CardProps) {
  return <div className={clsx('px-6 py-4', className)}>{children}</div>;
}

export function CardFooter({ children, className }: CardProps) {
  return <div className={clsx('border-t border-slate-100 px-6 py-4', className)}>{children}</div>;
}
