import Layout from '@/components/Layout';
import FactoryMap from '@/components/Map/FactoryMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Users, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from "react";
import { API_URL, useAuth } from "@/contexts/AuthContext";

function NotificationList() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const { token } = useAuth();

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/monitor/notifications?limit=20`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 3000);
    return () => clearInterval(interval);
  }, [token]);

  if (notifications.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8 text-sm">
        暂无报警通知
      </div>
    );
  }

  return (
    <>
      {notifications.map((note) => (
        <div 
          key={note.id} 
          className={`p-3 rounded-md border text-sm ${
            note.level === 2 
              ? 'bg-destructive/10 border-destructive/30 text-destructive-foreground' 
              : note.level === 1
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
          }`}
        >
          <div className="flex justify-between items-start mb-1">
            <span className="font-bold text-xs px-1.5 py-0.5 rounded bg-background/50">
              {note.target}
            </span>
            <span className="text-[10px] opacity-70">
              {new Date(note.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <p className="leading-snug">{note.message}</p>
        </div>
      ))}
    </>
  );
}

export default function Home() {
  return (
    <Layout>
      <div className="h-full flex flex-col space-y-4">
        {/* 顶部统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">在岗人数</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">42</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-emerald-500">95%</span> 出勤率
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">缺岗报警</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">3</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-destructive">2</span> 个岗位无人
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">岗位覆盖率</CardTitle>
              <Activity className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">88%</div>
              <p className="text-xs text-muted-foreground mt-1">
                28/32 个关键岗位
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">平均在岗时长</CardTitle>
              <ShieldCheck className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">7.2 小时</div>
              <p className="text-xs text-muted-foreground mt-1">
                今日平均工时
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-[500px]">
          {/* 主地图区域 */}
          <div className="lg:col-span-3 bg-card/30 rounded-lg border border-border p-1 relative overflow-hidden">
            <FactoryMap />
          </div>

          {/* 实时通知面板 */}
          <div className="lg:col-span-1 bg-card/30 rounded-lg border border-border p-4 flex flex-col">
            <h3 className="font-display font-bold text-lg mb-4 flex items-center">
              <span className="w-2 h-2 rounded-full bg-primary mr-2 animate-pulse"></span>
              实时报警通知
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              <NotificationList />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
