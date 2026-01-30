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
import { Camera, Plus, Edit, Trash2, RefreshCw, Video, PlayCircle, CloudDownload } from 'lucide-react';
import { API_URL, useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

interface Camera {
  id: number;
  name: string;
  rtsp_url: string;
  location: string;
  status: string;
  index_code?: string;
  is_active: boolean;
  is_online?: boolean;
  map_id?: number;
}

interface MapConfig {
  id: number;
  name: string;
}

export default function Cameras() {
  const { token } = useAuth();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [maps, setMaps] = useState<MapConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentCamera, setCurrentCamera] = useState<Partial<Camera>>({});
  const [previewUrl, setPreviewUrl] = useState('');

  const fetchCameras = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/cameras`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (Array.isArray(response.data)) {
        setCameras(response.data);
      } else {
        console.error('Invalid cameras data format:', response.data);
        setCameras([]);
        toast.error('获取摄像头数据格式错误');
      }
    } catch (error) {
      console.error('Failed to fetch cameras:', error);
      toast.error('获取摄像头列表失败');
      setCameras([]);
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
      fetchCameras();
      fetchMaps();
    }
  }, [token]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await axios.post(`${API_URL}/cameras/sync`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`同步成功，更新了 ${response.data.synced_count} 个摄像头`);
      fetchCameras();
    } catch (error: any) {
      console.error('Sync failed:', error);
      toast.error(error.response?.data?.detail || '同步失败，请检查海康威视配置');
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async () => {
    try {
      if (currentCamera.id) {
        await axios.put(`${API_URL}/cameras/${currentCamera.id}`, currentCamera, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('摄像头已更新');
      } else {
        await axios.post(`${API_URL}/cameras`, {
          ...currentCamera,
          is_active: true,
          status: 'offline'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('摄像头已添加');
      }
      setIsDialogOpen(false);
      fetchCameras();
    } catch (error) {
      toast.error('保存失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个摄像头吗？')) return;
    try {
      await axios.delete(`${API_URL}/cameras/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('摄像头已删除');
      fetchCameras();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const handlePreview = (camera: Camera) => {
    if (!camera.rtsp_url) {
      toast.error('该摄像头未配置 RTSP 地址');
      return;
    }
    const streamUrl = `${API_URL}/stream/preview?url=${encodeURIComponent(camera.rtsp_url)}`;
    setPreviewUrl(streamUrl);
    setCurrentCamera(camera);
    setIsPreviewOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-display font-bold tracking-tight">摄像头管理</h2>
            <p className="text-muted-foreground">配置和管理监控摄像头设备</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleSync} disabled={syncing}>
              <CloudDownload className={`w-4 h-4 mr-2 ${syncing ? 'animate-bounce' : ''}`} />
              {syncing ? '同步中...' : '同步海康设备'}
            </Button>
            <Button onClick={() => { setCurrentCamera({}); setIsDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              添加摄像头
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cameras.map((camera) => (
            <Card key={camera.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {camera.name}
                </CardTitle>
                <Video className={`h-4 w-4 ${camera.is_online ? 'text-green-500' : 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {camera.is_online ? <span className="text-green-500">在线</span> : <span className="text-muted-foreground">离线</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  索引码: {camera.index_code || '无'}
                </p>
                <div className="mt-2 text-xs text-muted-foreground">
                  所属厂区: {maps.find(m => m.id === camera.map_id)?.name || '未分配'}
                </div>
                <div className="mt-4 flex space-x-2">
                  <Button size="sm" variant="secondary" className="w-full" onClick={() => handlePreview(camera)}>
                    <PlayCircle className="w-4 h-4 mr-2" />
                    预览
                  </Button>
                  <Button size="sm" variant="outline" className="w-full" onClick={() => { setCurrentCamera(camera); setIsDialogOpen(true); }}>
                    配置
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>设备列表详情</CardTitle>
            <CardDescription>
              管理已接入系统的摄像头设备，支持 RTSP 流和海康威视设备
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>所属厂区</TableHead>
                  <TableHead>位置</TableHead>
                  <TableHead>RTSP 地址 / Index Code</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cameras.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {loading ? '加载中...' : '暂无摄像头设备'}
                    </TableCell>
                  </TableRow>
                ) : (
                  cameras.map(camera => (
                    <TableRow key={camera.id}>
                      <TableCell className="font-medium flex items-center">
                        <Camera className="w-4 h-4 mr-2 text-muted-foreground" />
                        {camera.name}
                      </TableCell>
                      <TableCell>{maps.find(m => m.id === camera.map_id)?.name || '-'}</TableCell>
                      <TableCell>{camera.location}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground max-w-[200px] truncate">
                        {camera.index_code || camera.rtsp_url}
                      </TableCell>
                      <TableCell>
                        <Badge variant={camera.is_online ? 'default' : 'secondary'}>
                          {camera.is_online ? '在线' : '离线'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handlePreview(camera)}>
                            <PlayCircle className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setCurrentCamera(camera); setIsDialogOpen(true); }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(camera.id)}>
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

        {/* 编辑/添加对话框 */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{currentCamera.id ? '编辑摄像头' : '添加摄像头'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>摄像头名称</Label>
                <Input 
                  value={currentCamera.name || ''} 
                  onChange={e => setCurrentCamera({...currentCamera, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>所属厂区</Label>
                <Select 
                  value={currentCamera.map_id?.toString()} 
                  onValueChange={(val) => setCurrentCamera({...currentCamera, map_id: parseInt(val)})}
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
                <Label>安装位置</Label>
                <Input 
                  value={currentCamera.location || ''} 
                  onChange={e => setCurrentCamera({...currentCamera, location: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>RTSP 地址 (可选)</Label>
                <Input 
                  placeholder="rtsp://..."
                  value={currentCamera.rtsp_url || ''} 
                  onChange={e => setCurrentCamera({...currentCamera, rtsp_url: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>海康威视 Index Code (可选)</Label>
                <Input 
                  placeholder="设备唯一标识码"
                  value={currentCamera.index_code || ''} 
                  onChange={e => setCurrentCamera({...currentCamera, index_code: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>取消</Button>
              <Button onClick={handleSave}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 视频预览对话框 */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Video className="w-5 h-5 mr-2 text-primary" />
                实时预览 - {currentCamera.name}
              </DialogTitle>
            </DialogHeader>
            <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center relative">
              {previewUrl ? (
                <img 
                  src={previewUrl} 
                  alt="Live Stream" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    toast.error('视频流连接失败');
                  }}
                />
              ) : (
                <div className="text-white text-sm">正在连接视频流...</div>
              )}
              
              <div className="absolute top-2 right-2 bg-black/50 px-2 py-1 rounded text-xs text-white flex items-center">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-2"></div>
                LIVE
              </div>
            </div>
            <DialogFooter>
              <div className="text-xs text-muted-foreground mr-auto">
                RTSP: {currentCamera.rtsp_url}
              </div>
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>关闭</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
