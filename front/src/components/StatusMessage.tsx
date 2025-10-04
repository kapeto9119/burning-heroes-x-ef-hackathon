import { CheckCircle2, XCircle, Info, AlertCircle } from 'lucide-react';
import { Alert } from '@/components/ui/alert';

interface StatusMessageProps {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertCircle,
};

const colorMap = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
};

export function StatusMessage({ type, message }: StatusMessageProps) {
  const Icon = iconMap[type];
  
  return (
    <Alert className={`${colorMap[type]} flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300`}>
      <Icon size={20} className="flex-shrink-0" />
      <p className="text-sm font-medium">{message}</p>
    </Alert>
  );
}
