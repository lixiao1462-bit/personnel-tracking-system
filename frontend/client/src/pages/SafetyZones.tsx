import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Plus, Edit, Trash2, ShieldAlert, Shield } from 'lucide-react';
import { API_URL, useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

interface SafetyZone {
  id: number;
  name: string;
  zone_type: string;
  description: string;
  is_active: boolean;
  vertices_meters: any;
  map_id?: number;
  alarm_rules?: {
    min_people?: number;
    level?: number;
  };
}

interface MapConfig {
  id: number;
  name: string;
}

export default function SafetyZones() {
  const { token } = useAuth();
  const [zones, setZones] = useState<SafetyZone[]>([]);
  const [maps, setMaps] = useState<MapConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentZone, setCurrentZone] = useState<Partial<SafetyZone>>({});

  const fetchZones = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/safety-zones`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setZones(response.data);
    } catch (error) {
      console.error('Failed to fetch zones:', error);
      toast.error('获取区域列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchMaps = async () => {
    try {
      const response = await axios.get(`${API_URL}/maps/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMaps(response.data);
    } catch (error) {
      console.error("Failed to fetch maps:", error);
    }
  };

  useEffect(() => {
    if (token) {
      fetchZones();
      fetchMaps();
    }
  }, [token]);

  const handleSave = async () => {
    try {
      // 确保 vertices_meters 是有效的 JSON
      let vertices = currentZone.vertices_meters;
      if (typeof vertices === 'string') {
        try {
          vertices = JSON.parse(vertices);
        } catch (e) {
          toast.error('坐标格式错误，请输入有效的 JSON 数组');
          return;
        }
      }

      const data = {
        ...currentZone,
        vertices_meters: vertices,
        is_active: true
      };

      if (currentZone.id) {
        await axios.put(`${API_URL}/safety-zones/${currentZone.id}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('区域已更新');
      } else {
        await axios.post(`${API_URL}/safety-zones`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('区域已添加');
      }
      setIsDialogOpen(false);
      fetchZones();
    } catch (error) {
      toast.error('保存失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个区域吗？')) return;
    try {
      await axios.delete(`${API_URL}/safety-zones/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('区域已删除');
      fetchZones();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const getZoneTypeLabel = (type: string) => {
    switch (type) {
      case 'welding': return '焊接区';
      case 'assembly': return '装配线';
      case 'warehouse': return '仓库';
      case 'dangerous': return '危险区';
      default: return type;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-display font-bold tracking-tight">电子围栏</h2>
            <p className="text-muted-foreground">管理工厂区域和安全监控范围</p>
          </div>
          <Button onClick={() => { setCurrentZone({ zone_type: 'general' }); setIsDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            添加区域
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总区域数</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{zones.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">启用中</CardTitle>
              <Shield className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{zones.filter(z => z.is_active).length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">重点监控</CardTitle>
              <Shield className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{zones.filter(z => z.alarm_rules?.level && z.alarm_rules.level > 1).length}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>区域列表</CardTitle>
            <CardDescription>
              定义需要监控的工作区域，系统将自动检测人员在岗情况
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>所属厂区</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead>坐标点数</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      暂无区域配置
                    </TableCell>
                  </TableRow>
                ) : (
                  zones.map(zone => (
                    <TableRow key={zone.id}>
                      <TableCell className="font-medium flex items-center">
                        <ShieldAlert className="w-4 h-4 mr-2 text-muted-foreground" />
                        {zone.name}
                      </TableCell>
                      <TableCell>{maps.find(m => m.id === zone.map_id)?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getZoneTypeLabel(zone.zone_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>{zone.description}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {Array.isArray(zone.vertices_meters) ? zone.vertices_meters.length : 0} 点
                      </TableCell>
                      <TableCell>
                        <Badge variant={zone.is_active ? 'default' : 'secondary'}>
                          {zone.is_active ? '启用' : '禁用'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => { setCurrentZone(zone); setIsDialogOpen(true); }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(zone.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{currentZone.id ? '编辑区域' : '添加区域'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>区域名称</Label>
                <Input 
                  value={currentZone.name || ''} 
                  onChange={e => setCurrentZone({...currentZone, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>所属厂区</Label>
                <Select 
                  value={currentZone.map_id?.toString()} 
                  onValueChange={(val) => setCurrentZone({...currentZone, map_id: parseInt(val)})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择厂区" />
                  </SelectTrigger>
                  <SelectContent>
                    {maps.map(m => (
                      <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>区域类型</Label>
                <Select 
                  value={currentZone.zone_type} 
                  onValueChange={v => setCurrentZone({...currentZone, zone_type: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="welding">焊接区</SelectItem>
                    <SelectItem value="assembly">装配线</SelectItem>
                    <SelectItem value="warehouse">仓库</SelectItem>
                    <SelectItem value="dangerous">危险区</SelectItem>
                    <SelectItem value="general">普通区域</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>描述</Label>
                <Input 
                  value={currentZone.description || ''} 
                  onChange={e => setCurrentZone({...currentZone, description: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>坐标点 (JSON 格式)</Label>
                <Input 
                  placeholder="[[0,0], [10,0], [10,10], [0,10]]"
                  value={typeof currentZone.vertices_meters === 'string' ? currentZone.vertices_meters : JSON.stringify(currentZone.vertices_meters || [])} 
                  onChange={e => setCurrentZone({...currentZone, vertices_meters: e.target.value})}
                />
                <p className="text-xs text-muted-foreground">请输入米制坐标数组，例如 [[x1,y1], [x2,y2], ...]</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>取消</Button>
              <Button onClick={handleSave}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
