import { useEffect, useState, useRef } from 'react';
import { MapContainer, ImageOverlay, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { API_URL } from '@/contexts/AuthContext';
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Map as MapIcon, Video, Camera as CameraIcon } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

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

// 自定义摄像头图标
const CameraMarkerIcon = L.divIcon({
  className: 'custom-camera-icon',
  html: `<div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white hover:bg-blue-600 transition-colors cursor-pointer">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

interface MapConfig {
  id: number;
  name: string;
  image_url: string;
  image_width: number;
  image_height: number;
  scale_ratio: number;
}

interface Person {
  id: string;
  role: string;
  x: number;
  y: number;
  last_seen: string;
}

interface WorkZone {
  id: string;
  name: string;
  points: [number, number][]; // [y, x] 像素坐标
  required_role: string;
  min_staff: number;
  current_staff: number;
  status: 'normal' | 'warning' | 'alarm'; // 正常 | 缺岗 | 无人
}

interface CameraDevice {
  id: number;
  name: string;
  rtsp_url: string;
  location: string;
  status: string;
  is_online: boolean;
  map_id?: number;
  // 假设摄像头也有坐标，这里暂时模拟随机坐标，实际应从后端获取
  x?: number;
  y?: number;
}

// 地图控制器组件
function MapController({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds);
    }
  }, [map, bounds]);
  return null;
}

// 判断点是否在多边形内 (Ray Casting 算法)
function isPointInPolygon(point: [number, number], vs: [number, number][]) {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export default function FactoryMap() {
  const [mapConfig, setMapConfig] = useState<MapConfig | null>(null);
  const [allMaps, setAllMaps] = useState<MapConfig[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [zones, setZones] = useState<WorkZone[]>([]);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const { token } = useAuth();
  const mapRef = useRef<L.Map>(null);
  const [isInfoCollapsed, setIsInfoCollapsed] = useState(false);
  
  // 视频预览状态
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentCamera, setCurrentCamera] = useState<CameraDevice | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');

  // 处理图片 URL
  const getImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    
    // 移除开头的 /api 或 /static，避免重复
    // 这里的逻辑要和 MapManagement.tsx 保持一致
    const baseUrl = API_URL.replace(/\/api\/v1$/, '').replace(/\/api$/, '');
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  // 获取所有地图列表
  const fetchAllMaps = async () => {
    try {
      const response = await axios.get(`${API_URL}/maps/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllMaps(response.data);
      
      // 如果没有当前地图，默认选择第一个
      if (!mapConfig && response.data.length > 0) {
        // 优先查找 active 的地图
        const activeMap = response.data.find((m: any) => m.is_active);
        setMapConfig(activeMap || response.data[0]);
      }
    } catch (error) {
      console.error("Failed to fetch maps:", error);
    }
  };

  useEffect(() => {
    if (token) fetchAllMaps();
  }, [token]);

  // 初始化岗位区域和摄像头
  useEffect(() => {
    if (!mapConfig) return;
    
    const fetchData = async () => {
      try {
        // 获取区域
        const zonesRes = await axios.get(`${API_URL}/safety-zones/?skip=0&limit=100`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // 获取摄像头
        const camerasRes = await axios.get(`${API_URL}/cameras`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (zonesRes.data) {
          const currentMapZones = zonesRes.data.filter((z: any) => !z.map_id || z.map_id === mapConfig.id);
          const mappedZones: WorkZone[] = currentMapZones.map((z: any) => {
            const points = z.vertices_meters.map((v: any) => [
              v.y / mapConfig.scale_ratio, 
              v.x / mapConfig.scale_ratio
            ] as [number, number]);

            const minStaff = z.alarm_rules?.min_people || 1;

            return {
              id: z.id.toString(),
              name: z.name,
              points: points,
              required_role: 'worker',
              min_staff: minStaff,
              current_staff: 0,
              status: 'normal'
            };
          });
          setZones(mappedZones);
        }

        if (camerasRes.data && Array.isArray(camerasRes.data)) {
          // 过滤当前地图的摄像头，并模拟坐标（实际应从后端获取 x, y）
          // 这里为了演示，随机生成坐标
          const currentMapCameras = camerasRes.data
            .filter((c: any) => !c.map_id || c.map_id === mapConfig.id)
            .map((c: any, index: number) => ({
              ...c,
              // 模拟坐标分布在地图中间区域
              x: (mapConfig.image_width * 0.2) + (Math.random() * mapConfig.image_width * 0.6),
              y: (mapConfig.image_height * 0.2) + (Math.random() * mapConfig.image_height * 0.6)
            }));
          setCameras(currentMapCameras);
        }

      } catch (error) {
        console.error("Failed to fetch map data:", error);
      }
    };

    fetchData();
  }, [mapConfig, token]);

  // 模拟实时人员数据
  useEffect(() => {
    if (!mapConfig) return;

    const interval = setInterval(() => {
      const newPersons = Array.from({ length: 6 }).map((_, i) => ({
        id: `P00${i+1}`,
        role: ['operator', 'inspector', 'logistics'][i % 3],
        x: (Math.random() * mapConfig.image_width * mapConfig.scale_ratio),
        y: (Math.random() * mapConfig.image_height * mapConfig.scale_ratio),
        last_seen: new Date().toISOString()
      }));
      setPersons(newPersons);

      setZones(prevZones => prevZones.map(zone => {
        const polyPoints = zone.points.map(p => [p[1], p[0]] as [number, number]);
        
        const staffCount = newPersons.filter(p => {
          const px = p.x / mapConfig.scale_ratio;
          const py = p.y / mapConfig.scale_ratio;
          return isPointInPolygon([px, py], polyPoints);
        }).length;

        let status: WorkZone['status'] = 'normal';
        if (staffCount === 0) status = 'alarm';
        else if (staffCount < zone.min_staff) status = 'warning';

        return {
          ...zone,
          current_staff: staffCount,
          status
        };
      }));

    }, 2000);

    return () => clearInterval(interval);
  }, [mapConfig]);

  const handleCameraClick = (camera: CameraDevice) => {
    if (!camera.rtsp_url) {
      toast.error('该摄像头未配置 RTSP 地址');
      return;
    }
    const streamUrl = `${API_URL}/stream/preview?url=${encodeURIComponent(camera.rtsp_url)}`;
    setPreviewUrl(streamUrl);
    setCurrentCamera(camera);
    setIsPreviewOpen(true);
  };

  if (!mapConfig) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/20 rounded-lg border border-border">
        <div className="text-center">
          <p className="text-muted-foreground">正在加载地图配置...</p>
        </div>
      </div>
    );
  }

  const bounds: L.LatLngBoundsExpression = [
    [0, 0],
    [mapConfig.image_height, mapConfig.image_width]
  ];

  const getZoneColor = (status: WorkZone['status']) => {
    switch (status) {
      case 'normal': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'alarm': return '#ef4444';
    }
  };

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-border shadow-lg relative group">
      <MapContainer 
        key={mapConfig.id} // 切换地图时强制重新渲染
        center={[mapConfig.image_height / 2, mapConfig.image_width / 2]} 
        zoom={-1} 
        crs={L.CRS.Simple}
        style={{ height: '100%', width: '100%', background: '#0f172a' }}
        ref={mapRef}
        minZoom={-3}
        zoomControl={false} // 禁用默认缩放控件，避免重叠
      >
        <ImageOverlay
          url={getImageUrl(mapConfig.image_url)}
          bounds={bounds}
        />
        
        {zones.map(zone => (
          <Polygon
            key={zone.id}
            positions={zone.points}
            pathOptions={{
              color: getZoneColor(zone.status),
              fillColor: getZoneColor(zone.status),
              fillOpacity: 0.2,
              weight: 2,
              dashArray: zone.status === 'alarm' ? '5, 10' : undefined
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-sm">{zone.name}</h3>
                <div className="mt-1 space-y-1 text-xs">
                  <p>状态: <span style={{color: getZoneColor(zone.status), fontWeight: 'bold'}}>
                    {zone.status === 'normal' ? '正常在岗' : zone.status === 'warning' ? '人员不足' : '无人缺岗'}
                  </span></p>
                  <p>当前人数: {zone.current_staff} / {zone.min_staff}</p>
                </div>
              </div>
            </Popup>
          </Polygon>
        ))}

        {/* 摄像头标记 */}
        {cameras.map(camera => (
          <Marker
            key={`cam-${camera.id}`}
            position={[camera.y || 0, camera.x || 0]}
            icon={CameraMarkerIcon}
            eventHandlers={{
              click: () => handleCameraClick(camera)
            }}
          >
            {/* 移除 Popup，改为直接点击触发预览 */}
          </Marker>
        ))}

        {persons.map(person => (
          <Marker 
            key={person.id}
            position={[
              person.y / mapConfig.scale_ratio, 
              person.x / mapConfig.scale_ratio
            ]}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-sm">{person.id}</h3>
                <p className="text-xs text-muted-foreground">岗位: {person.role}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        <MapController bounds={bounds} />
      </MapContainer>

      {/* 自定义缩放控件 - 移至右下角 */}
      <div className="absolute bottom-20 right-4 z-[1000] flex flex-col gap-1">
        <Button 
          size="icon" 
          variant="secondary" 
          className="h-8 w-8 rounded-full shadow-md opacity-80 hover:opacity-100"
          onClick={() => mapRef.current?.zoomIn()}
        >
          +
        </Button>
        <Button 
          size="icon" 
          variant="secondary" 
          className="h-8 w-8 rounded-full shadow-md opacity-80 hover:opacity-100"
          onClick={() => mapRef.current?.zoomOut()}
        >
          -
        </Button>
      </div>

      {/* 地图图例 */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-background/80 backdrop-blur-md p-3 rounded-md border border-border shadow-lg">
        <h4 className="text-xs font-bold mb-2 text-muted-foreground">岗位状态图例</h4>
        <div className="space-y-1.5">
          <div className="flex items-center text-xs">
            <span className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></span>
            <span>正常在岗</span>
          </div>
          <div className="flex items-center text-xs">
            <span className="w-3 h-3 rounded-full bg-amber-500 mr-2"></span>
            <span>人员不足</span>
          </div>
          <div className="flex items-center text-xs">
            <span className="w-3 h-3 rounded-full bg-red-500 mr-2 animate-pulse"></span>
            <span>无人缺岗</span>
          </div>
          <div className="flex items-center text-xs mt-2 pt-2 border-t border-border">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2 border border-white"></div>
            <span>监控摄像头</span>
          </div>
        </div>
      </div>

      {/* 地图信息与切换 - 可折叠 */}
      <div className={`absolute top-4 left-4 z-[1000] transition-all duration-300 ease-in-out ${isInfoCollapsed ? 'w-10 h-10 overflow-hidden' : 'w-72'}`}>
        <div className="bg-background/90 backdrop-blur-md rounded-lg border border-border shadow-xl overflow-hidden">
          {isInfoCollapsed ? (
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-full h-full" 
              onClick={() => setIsInfoCollapsed(false)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <div className="p-4 relative">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 h-6 w-6" 
                onClick={() => setIsInfoCollapsed(true)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="mb-4 pr-8">
                <label className="text-xs text-muted-foreground mb-1 block">当前厂区/楼层</label>
                <Select 
                  value={mapConfig.id.toString()} 
                  onValueChange={(val) => {
                    const selected = allMaps.find(m => m.id.toString() === val);
                    if (selected) setMapConfig(selected);
                  }}
                >
                  <SelectTrigger className="h-8 text-sm font-bold">
                    <SelectValue placeholder="选择厂区" />
                  </SelectTrigger>
                  <SelectContent>
                    {allMaps.map(m => (
                      <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-xs text-muted-foreground space-y-2">
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span>在线人员</span>
                  <span className="font-mono font-bold text-foreground text-sm">{persons.length}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span>监控岗位</span>
                  <span className="font-mono font-bold text-foreground text-sm">{zones.length}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-destructive/10 rounded border border-destructive/20">
                  <span className="text-destructive">缺岗区域</span>
                  <span className="font-mono font-bold text-destructive text-sm">{zones.filter(z => z.status !== 'normal').length}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-blue-500/10 rounded border border-blue-500/20">
                  <span className="text-blue-500">摄像头</span>
                  <span className="font-mono font-bold text-blue-500 text-sm">{cameras.length}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 视频预览弹窗 */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl bg-background/95 backdrop-blur-xl border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Video className="w-5 h-5 mr-2 text-primary" />
              实时监控 - {currentCamera?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center relative shadow-2xl">
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
            
            <div className="absolute top-4 right-4 bg-red-600/90 px-3 py-1 rounded-full text-xs font-bold text-white flex items-center shadow-lg animate-pulse">
              <div className="w-2 h-2 rounded-full bg-white mr-2"></div>
              LIVE
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
              <p className="text-sm font-medium">{currentCamera?.location || '未知位置'}</p>
              <p className="text-xs opacity-70 font-mono">{currentCamera?.rtsp_url}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>关闭预览</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
