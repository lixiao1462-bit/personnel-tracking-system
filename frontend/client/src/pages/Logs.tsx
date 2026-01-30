
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, RefreshCw, Calendar as CalendarIcon } from 'lucide-react';
import { API_URL, useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface Log {
  id: number;
  user_id: number;
  username: string;
  operation: string;
  resource: string;
  resource_id?: string;
  ip_address: string;
  user_agent: string;
  status: string;
  details?: string;
  created_at: string;
}

interface Option {
  key: string;
  name: string;
}

export default function Logs() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  
  const [operations, setOperations] = useState<Option[]>([]);
  const [resources, setResources] = useState<Option[]>([]);
  
  const [filter, setFilter] = useState({
    operation: 'all',
    resource: 'all',
    status: 'all',
    date: undefined as Date | undefined
  });

  // 获取选项数据
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [opsRes, resRes] = await Promise.all([
          axios.get(`${API_URL}/logs/operations`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/logs/resources`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setOperations(opsRes.data);
        setResources(resRes.data);
      } catch (error) {
        console.error('Failed to fetch options:', error);
      }
    };
    if (token) fetchOptions();
  }, [token]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('page_size', pageSize.toString());
      
      if (filter.operation !== 'all') params.append('operation', filter.operation);
      if (filter.resource !== 'all') params.append('resource', filter.resource);
      if (filter.status !== 'all') params.append('status', filter.status);
      if (filter.date) {
        // 设置当天的开始和结束时间
        const start = new Date(filter.date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(filter.date);
        end.setHours(23, 59, 59, 999);
        
        params.append('start_time', start.toISOString());
        params.append('end_time', end.toISOString());
      }
      
      const response = await axios.get(`${API_URL}/logs`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      
      setLogs(response.data.items);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      toast.error('获取日志失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchLogs();
  }, [token, page, filter]);

  const getStatusBadge = (status: string) => {
    return status === 'success' 
      ? <Badge className="bg-emerald-500">成功</Badge>
      : <Badge variant="destructive">失败</Badge>;
  };

  const getOperationName = (key: string) => {
    return operations.find(op => op.key === key)?.name || key;
  };

  const getResourceName = (key: string) => {
    return resources.find(res => res.key === key)?.name || key;
  };

  return (
    <Layout>
      <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-display font-bold tracking-tight">操作日志</h2>
            <p className="text-muted-foreground">审计系统操作记录与变更历史</p>
          </div>
          <Button variant="outline" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>

        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="py-4">
            <div className="flex flex-wrap gap-4">
              <Select 
                value={filter.operation} 
                onValueChange={v => { setFilter({...filter, operation: v}); setPage(1); }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="操作类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部操作</SelectItem>
                  {operations.map(op => (
                    <SelectItem key={op.key} value={op.key}>{op.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={filter.resource} 
                onValueChange={v => { setFilter({...filter, resource: v}); setPage(1); }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="资源类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部资源</SelectItem>
                  {resources.map(res => (
                    <SelectItem key={res.key} value={res.key}>{res.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={filter.status} 
                onValueChange={v => { setFilter({...filter, status: v}); setPage(1); }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="success">成功</SelectItem>
                  <SelectItem value="failed">失败</SelectItem>
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[200px] justify-start text-left font-normal",
                      !filter.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filter.date ? format(filter.date, "yyyy-MM-dd") : <span>选择日期</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filter.date}
                    onSelect={d => { setFilter({...filter, date: d}); setPage(1); }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              {filter.date && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => { setFilter({...filter, date: undefined}); setPage(1); }}
                  title="清除日期"
                >
                  <span className="text-xl">×</span>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>操作</TableHead>
                  <TableHead>资源</TableHead>
                  <TableHead>IP地址</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>详情</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      暂无日志记录
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.created_at), 'MM-dd HH:mm:ss')}
                      </TableCell>
                      <TableCell>{log.username}</TableCell>
                      <TableCell>{getOperationName(log.operation)}</TableCell>
                      <TableCell>{getResourceName(log.resource)}</TableCell>
                      <TableCell className="font-mono text-xs">{log.ip_address}</TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="max-w-[300px] truncate" title={log.details}>
                        {log.details || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
          
          {/* 分页控件 */}
          <div className="p-4 border-t flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              共 {total} 条记录
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                上一页
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page * pageSize >= total}
                onClick={() => setPage(p => p + 1)}
              >
                下一页
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
