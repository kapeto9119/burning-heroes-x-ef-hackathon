'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';
import { getUserStats, type UserStats } from '@/app/actions/workflows';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: string;
}

function StatCard({ title, value, subtitle, icon, trend, trendValue, color = 'blue' }: StatCardProps) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    green: 'from-green-500/20 to-green-600/20 border-green-500/30',
    red: 'from-red-500/20 to-red-600/20 border-red-500/30',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
    orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/30',
  }[color];

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${colorClasses} p-6`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <h3 className="text-3xl font-bold mb-1">{value}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-500/20`}>
          {icon}
        </div>
      </div>
      
      {trend && trendValue && (
        <div className="mt-4 flex items-center gap-2">
          {trend === 'up' ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : trend === 'down' ? (
            <TrendingDown className="w-4 h-4 text-red-500" />
          ) : null}
          <span className={`text-xs font-medium ${
            trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
          }`}>
            {trendValue}
          </span>
        </div>
      )}
    </motion.div>
  );
}

export function AnalyticsDashboard() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    const result = await getUserStats();
    if (result.success) {
      setStats(result.data);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-accent/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No statistics available yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Workflows"
          value={stats.totalDeployments}
          subtitle={`${stats.activeDeployments} active`}
          icon={<Activity className="w-6 h-6 text-blue-500" />}
          color="blue"
        />
        
        <StatCard
          title="Total Executions"
          value={stats.totalExecutions.toLocaleString()}
          subtitle="All time"
          icon={<Zap className="w-6 h-6 text-purple-500" />}
          color="purple"
        />
        
        <StatCard
          title="Success Rate"
          value={`${stats.successRate.toFixed(1)}%`}
          subtitle={`${stats.totalExecutions - stats.totalErrors} successful`}
          icon={<CheckCircle className="w-6 h-6 text-green-500" />}
          trend={stats.successRate >= 95 ? 'up' : stats.successRate >= 80 ? 'neutral' : 'down'}
          trendValue={stats.successRate >= 95 ? 'Excellent' : stats.successRate >= 80 ? 'Good' : 'Needs attention'}
          color="green"
        />
        
        <StatCard
          title="Total Errors"
          value={stats.totalErrors}
          subtitle={`${((stats.totalErrors / Math.max(stats.totalExecutions, 1)) * 100).toFixed(1)}% error rate`}
          icon={<XCircle className="w-6 h-6 text-red-500" />}
          color="red"
        />
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-background/40 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Successful Runs</p>
              <p className="text-xl font-bold">{(stats.totalExecutions - stats.totalErrors).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background/40 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Workflows</p>
              <p className="text-xl font-bold">{stats.activeDeployments}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background/40 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Zap className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg per Workflow</p>
              <p className="text-xl font-bold">
                {stats.totalDeployments > 0 
                  ? Math.round(stats.totalExecutions / stats.totalDeployments)
                  : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Health Status */}
      <div className="rounded-xl border border-border bg-background/40 p-6">
        <h3 className="text-lg font-semibold mb-4">System Health</h3>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Success Rate</span>
              <span className="text-sm font-medium">{stats.successRate.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-accent rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${
                  stats.successRate >= 95 ? 'bg-green-500' : 
                  stats.successRate >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${stats.successRate}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Active Workflows</span>
              <span className="text-sm font-medium">
                {stats.activeDeployments} / {stats.totalDeployments}
              </span>
            </div>
            <div className="h-2 bg-accent rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all"
                style={{ 
                  width: `${stats.totalDeployments > 0 
                    ? (stats.activeDeployments / stats.totalDeployments) * 100 
                    : 0}%` 
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
