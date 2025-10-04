'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Clock, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScheduleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (schedule: { days: string[]; time: string }) => void;
  workflowName: string;
}

const DAYS = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
];

export function ScheduleDialog({ isOpen, onClose, onSchedule, workflowName }: ScheduleDialogProps) {
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [time, setTime] = useState('09:00');

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const selectAllDays = () => {
    if (selectedDays.length === 7) {
      setSelectedDays([]);
    } else {
      setSelectedDays(DAYS.map(d => d.value));
    }
  };

  const selectWeekdays = () => {
    setSelectedDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  };

  const handleSchedule = () => {
    if (selectedDays.length === 0) return;
    
    onSchedule({ days: selectedDays, time });
    onClose();
    
    // Reset form
    setSelectedDays([]);
    setTime('09:00');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md backdrop-blur-xl bg-background/95 rounded-2xl border border-border shadow-2xl overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-accent transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Schedule Workflow</h2>
              <p className="text-sm text-muted-foreground">
                Set when <span className="font-medium text-foreground">{workflowName}</span> should run
              </p>
            </div>

            <div className="space-y-6">
              {/* Days Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Select Days
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectWeekdays}
                      className="text-xs text-primary hover:underline"
                    >
                      Weekdays
                    </button>
                    <button
                      type="button"
                      onClick={selectAllDays}
                      className="text-xs text-primary hover:underline"
                    >
                      {selectedDays.length === 7 ? 'Clear' : 'All'}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {DAYS.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={cn(
                        'aspect-square rounded-lg border-2 text-xs font-medium transition-all',
                        selectedDays.includes(day.value)
                          ? 'bg-primary text-primary-foreground border-primary shadow-md'
                          : 'border-border hover:border-primary/50 hover:bg-accent'
                      )}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Selection */}
              <div>
                <label className="text-sm font-medium flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4" />
                  Select Time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-lg"
                />
              </div>

              {/* Summary */}
              {selectedDays.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg bg-accent/50 border border-border"
                >
                  <p className="text-sm text-muted-foreground mb-1">Schedule Summary:</p>
                  <p className="text-sm font-medium">
                    {selectedDays.length === 7 ? 'Every day' : 
                     selectedDays.length === 5 && !selectedDays.includes('saturday') && !selectedDays.includes('sunday') ? 'Weekdays' :
                     `${selectedDays.length} day${selectedDays.length > 1 ? 's' : ''}`} at {time}
                  </p>
                </motion.div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSchedule}
                  disabled={selectedDays.length === 0}
                  className={cn(
                    'flex-1 rounded-lg bg-black text-white hover:bg-gray-800',
                    selectedDays.length === 0 && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  Schedule
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
