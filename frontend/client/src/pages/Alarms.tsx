import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Search, Filter, CheckCircle, Volume2, VolumeX } from 'lucide-react';
import { API_URL, useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Alarm {
  id: number;
  alarm_type: string;
  level: number;
  description: string;
  source: string;
  status: string;
  created_at: string;
  zone_name?: string;
  camera_name?: string;
}

export default function Alarms() {
  const { token } = useAuth();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({
    status: 'all',
    level: 'all',
    search: ''
  });
  const [soundEnabled, setSoundEnabled] = useState(true);

  // 简单的提示音 (Base64 编码的短促 beep 声)
  const playAlarmSound = () => {
    if (!soundEnabled) return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
      oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.5); // Drop to A4
      
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.error('Failed to play sound:', e);
    }
  };

  const fetchAlarms = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status !== 'all') params.append('status', filter.status);
      if (filter.level !== 'all') params.append('level', filter.level);
      
      const response = await axios.get(`${API_URL}/alarms/?skip=0&limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAlarms(response.data);
    } catch (error) {
      console.error('Failed to fetch alarms:', error);
      toast.error('获取报警记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAlarms();
  }, [token, filter.status, filter.level]);

  // WebSocket 连接
  useEffect(() => {
    if (!token) return;

    // 构造 WebSocket URL
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // 假设 API_URL 包含 /api/v1，我们需要替换 http 为 ws
    const wsUrl = API_URL.replace(/^http/, 'ws') + `/ws?token=${token}`;
    
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'alarm') {
          const newAlarm = message.data;
          // 将新告警添加到列表顶部
          setAlarms(prev => [newAlarm, ...prev]);
          // 显示通知
          toast.error(`新告警: ${newAlarm.message || newAlarm.description}`);
          // 播放声音
          playAlarmSound();
        }
      } catch (e) {
        console.error('WebSocket message parse error:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, [token]);

  const handleHandleAlarm = async (id: number) => {
    try {
      await axios.put(`${API_URL}/alarms/${id}/handle`, {
        status: 'resolved',
        handle_note: '人工确认处理'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('报警已处理');
      fetchAlarms();
    } catch (error) {
      toast.error('处理失败');
    }
  };

  const getLevelBadge = (level: number) => {
    switch (level) {
      case 1: return <Badge className="bg-yellow-500">一级报警</Badge>;
      case 2: return <Badge className="bg-orange-500">二级报警</Badge>;
      case 3: return <Badge className="bg-red-500">三级报警</Badge>;
      default: return <Badge variant="secondary">未知</Badge>;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-display font-bold tracking-tight">报警中心</h2>
            <p className="text-muted-foreground">查看和处理系统报警记录</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "关闭声音" : "开启声音"}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button variant="outline" onClick={fetchAlarms}>
              刷新列表
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="搜索报警内容..." 
                  className="pl-8"
                  value={filter.search}
                  onChange={e => setFilter({...filter, search: e.target.value})}
                />
              </div>
              <Select 
                value={filter.level} 
                onValueChange={v => setFilter({...filter, level: v})}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="报警级别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部级别</SelectItem>
                  <SelectItem value="3">三级报警</SelectItem>
                  <SelectItem value="2">二级报警</SelectItem>
                  <SelectItem value="1">一级报警</SelectItem>
                </SelectContent>
              </Select>
              <Select 
                value={filter.status} 
                onValueChange={v => setFilter({...filter, status: v})}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="处理状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="pending">待处理</SelectItem>
                  <SelectItem value="resolved">已处理</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>级别</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>来源</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alarms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      暂无报警记录
                    </TableCell>
                  </TableRow>
                ) : (
                  alarms.map(alarm => (
                    <TableRow key={alarm.id}>
                      <TableCell>{format(new Date(alarm.created_at), 'MM-dd HH:mm:ss')}</TableCell>
                      <TableCell>{getLevelBadge(alarm.level)}</TableCell>
                      <TableCell>{alarm.alarm_type}</TableCell>
                      <TableCell>{alarm.source}</TableCell>
                      <TableCell>{alarm.description}</TableCell>
                      <TableCell>
                        <Badge variant={alarm.status === 'pending' ? 'destructive' : 'outline'}>
                          {alarm.status === 'pending' ? '待处理' : '已处理'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {alarm.status === 'pending' && (
                          <Button size="sm" variant="ghost" onClick={() => handleHandleAlarm(alarm.id)}>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            处理
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
