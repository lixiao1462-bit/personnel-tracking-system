import { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Upload, Ruler, Trash2, Check, Map as MapIcon, X } from 'lucide-react';
import { API_URL, useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { MapContainer, ImageOverlay, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// 修复 Leaflet 默认图标问题
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapConfig {
  id: number;
  name: string;
  image_url: string;
  image_width: number;
  image_height: number;
  scale_ratio: number;
  is_active: boolean;
}

// 比例尺测量工具组件
function ScaleMeasureTool({ active, onMeasureComplete }: { active: boolean, onMeasureComplete: (distancePx: number) => void }) {
  const [points, setPoints] = useState<L.LatLng[]>([]);
  const map = useMapEvents({
    click(e) {
      if (!active) return;
      if (points.length < 2) {
        setPoints(prev => [...prev, e.latlng]);
      }
    }
  });

  useEffect(() => {
    if (points.length === 2) {
      const distance = map.project(points[0]).distanceTo(map.project(points[1]));
      onMeasureComplete(distance);
      setPoints([]); // 重置
    }
  }, [points, map, onMeasureComplete]);

  if (!active || points.length === 0) return null;

  return (
    <>
      {points.map((p, i) => (
        <Marker key={i} position={p} icon={L.divIcon({ className: 'bg-primary w-3 h-3 rounded-full border-2 border-white' })} />
      ))}
    </>
  );
}

export default function MapManagement() {
  const { token, permissions } = useAuth();
  const [maps, setMaps] = useState<MapConfig[]>([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [mapName, setMapName] = useState('');
  
  // 比例尺相关状态
  const [selectedMap, setSelectedMap] = useState<MapConfig | null>(null);
  const [isScaleDialogOpen, setIsScaleDialogOpen] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measuredPx, setMeasuredPx] = useState(0);
  const [realDistance, setRealDistance] = useState('');

  const fetchMaps = async () => {
    try {
      const response = await axios.get(`${API_URL}/maps/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMaps(response.data);
      // 如果当前选中的地图在列表中，更新其信息
      if (selectedMap) {
        const updatedMap = response.data.find((m: MapConfig) => m.id === selectedMap.id);
        if (updatedMap) setSelectedMap(updatedMap);
      }
    } catch (error) {
      toast.error('获取地图列表失败');
    }
  };

  useEffect(() => {
    if (token) fetchMaps();
  }, [token]);

  const handleUpload = async () => {
    if (!uploadFile || !mapName) {
      toast.error('请填写地图名称并选择文件');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('name', mapName);
    formData.append('scale_ratio', '0.05'); 

    try {
      const response = await axios.post(`${API_URL}/maps/upload`, formData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success('地图上传成功');
      setIsUploadOpen(false);
      setUploadFile(null);
      setMapName('');
      
      // 重新获取列表并自动选中新上传的地图
      await fetchMaps();
      // 假设后端返回新创建的地图对象，可以直接设置，或者从列表中查找
      // 这里简单起见，重新获取列表后，如果列表不为空且之前未选中，可以选中第一个
      // 或者根据 response.data (如果后端返回了新地图) 来选中
      if (response.data) {
          setSelectedMap(response.data);
      }
      
    } catch (error) {
      console.error(error);
      toast.error('上传失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这张地图吗？')) return;
    try {
      await axios.delete(`${API_URL}/maps/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('地图已删除');
      if (selectedMap?.id === id) setSelectedMap(null);
      fetchMaps();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const handleSetActive = async (id: number) => {
    try {
      await axios.put(`${API_URL}/maps/${id}/active`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('已切换当前生效地图');
      fetchMaps();
    } catch (error) {
      toast.error('切换失败');
    }
  };

  const handleScaleSave = async () => {
    if (!selectedMap || !measuredPx || !realDistance) return;
    
    const distanceMeters = parseFloat(realDistance);
    if (isNaN(distanceMeters) || distanceMeters <= 0) {
      toast.error('请输入有效的距离');
      return;
    }

    const newScale = distanceMeters / measuredPx;

    try {
      await axios.put(`${API_URL}/maps/${selectedMap.id}`, {
        ...selectedMap,
        scale_ratio: newScale
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`比例尺已更新: 1px = ${newScale.toFixed(4)}m`);
      setIsScaleDialogOpen(false);
      setIsMeasuring(false);
      setRealDistance('');
      fetchMaps();
    } catch (error) {
      toast.error('更新比例尺失败');
    }
  };

  // 处理图片 URL，确保是完整的 URL
  const getImageUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    // 移除开头的 /api 或 /static，避免重复
    const cleanPath = url.replace(/^\/api/, '').replace(/^\/static/, '');
    // 确保 API_URL 不以 /api 结尾，或者根据实际情况拼接
    // 这里假设 API_URL 是 http://localhost:8000/api
    // 而后端返回的 url 可能是 /static/maps/xxx.png
    // 所以我们需要构造 http://localhost:8000/static/maps/xxx.png
    const baseUrl = API_URL.replace(/\/api\/v1$/, '').replace(/\/api$/, '');
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  return (
    <Layout>
      <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-display font-bold tracking-tight">地图管理</h2>
            <p className="text-muted-foreground">上传工厂平面图并设置比例尺</p>
          </div>
          {permissions['map:create'] && (
            <Button onClick={() => setIsUploadOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              上传新地图
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
          {/* 左侧：地图列表 */}
          <Card className="lg:col-span-1 flex flex-col h-full">
            <CardHeader>
              <CardTitle>地图列表</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maps.map(map => (
                    <TableRow 
                      key={map.id} 
                      className={`cursor-pointer ${selectedMap?.id === map.id ? 'bg-muted' : ''}`}
                      onClick={() => setSelectedMap(map)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <MapIcon className="w-4 h-4 mr-2 text-muted-foreground" />
                          {map.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {map.is_active && <Badge variant="default" className="bg-emerald-500">当前使用</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {!map.is_active && permissions['map:update'] && (
                            <Button size="icon" variant="ghost" title="设为当前" onClick={(e) => { e.stopPropagation(); handleSetActive(map.id); }}>
                              <Check className="w-4 h-4 text-emerald-500" />
                            </Button>
                          )}
                          {permissions['map:delete'] && (
                            <Button size="icon" variant="ghost" title="删除" onClick={(e) => { e.stopPropagation(); handleDelete(map.id); }}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 右侧：预览与设置 */}
          <Card className="lg:col-span-2 flex flex-col h-full overflow-hidden">
            {selectedMap ? (
              <>
                <CardHeader className="border-b border-border py-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{selectedMap.name}</CardTitle>
                    <CardDescription>
                      尺寸: {selectedMap.image_width}x{selectedMap.image_height}px | 
                      比例尺: 1px = {(selectedMap.scale_ratio || 0).toFixed(4)}m
                    </CardDescription>
                  </div>
                  {permissions['map:update'] && (
                    <Button variant="outline" size="sm" onClick={() => { setIsMeasuring(true); toast.info('请在地图上点击两个点来测量距离'); }}>
                      <Ruler className="w-4 h-4 mr-2" />
                      校准比例尺
                    </Button>
                  )}
                </CardHeader>
                <div className="flex-1 relative bg-slate-900">
                  <MapContainer 
                    key={selectedMap.id} // 强制重新渲染
                    center={[selectedMap.image_height / 2, selectedMap.image_width / 2]} 
                    zoom={-1} 
                    crs={L.CRS.Simple}
                    style={{ height: '100%', width: '100%' }}
                    minZoom={-3}
                  >
                    <ImageOverlay
                      url={getImageUrl(selectedMap.image_url)}
                      bounds={[[0, 0], [selectedMap.image_height, selectedMap.image_width]]}
                    />
                    <ScaleMeasureTool 
                      active={isMeasuring} 
                      onMeasureComplete={(px) => {
                        setMeasuredPx(px);
                        setIsMeasuring(false);
                        setIsScaleDialogOpen(true);
                      }} 
                    />
                  </MapContainer>
                  
                  {isMeasuring && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg animate-pulse flex items-center">
                      正在测量模式：请点击地图上的两个点
                      <Button variant="ghost" size="icon" className="h-6 w-6 ml-2 hover:bg-primary-foreground/20 rounded-full" onClick={() => setIsMeasuring(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MapIcon className="w-16 h-16 mb-4 opacity-20" />
                <p>请从左侧选择一张地图进行预览或设置</p>
              </div>
            )}
          </Card>
        </div>

        {/* 上传对话框 */}
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>上传新地图</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>地图名称</Label>
                <Input value={mapName} onChange={e => setMapName(e.target.value)} placeholder="例如：一楼车间平面图" />
              </div>
              <div className="space-y-2">
                <Label>图片文件</Label>
                <Input type="file" accept="image/*" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadOpen(false)}>取消</Button>
              <Button onClick={handleUpload}>上传</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 比例尺设置对话框 */}
        <Dialog open={isScaleDialogOpen} onOpenChange={setIsScaleDialogOpen}>
          <DialogContent className="z-[9999]">
            <DialogHeader>
              <DialogTitle>设置比例尺</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                测量像素距离: <span className="font-bold text-foreground">{measuredPx.toFixed(0)} px</span>
              </p>
              <div className="space-y-2">
                <Label>实际距离 (米)</Label>
                <Input 
                  type="number" 
                  value={realDistance} 
                  onChange={e => setRealDistance(e.target.value)} 
                  placeholder="例如：10.5" 
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsScaleDialogOpen(false)}>取消</Button>
              <Button onClick={handleScaleSave}>保存设置</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
