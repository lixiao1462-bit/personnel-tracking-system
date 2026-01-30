import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Save, RefreshCw, Upload, Database, Bell, Shield, Camera, Key } from 'lucide-react';
import { API_URL, useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

interface SystemConfig {
  key: string;
  value: string;
  value_type: string;
  description?: string;
  category: string;
  is_secret: boolean;
}

export default function Settings() {
  const { token, permissions } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [configs, setConfigs] = useState<Record<string, string>>({});
  
  // 默认配置项
  const defaultConfigs = {
    // AI 配置
    'ai.inference_fps': '5',
    'ai.confidence_threshold': '0.5',
    'ai.track_max_age': '30',
    
    // 钉钉配置
    'dingtalk.enabled': 'false',
    'dingtalk.webhook': '',
    'dingtalk.secret': '',
    'dingtalk.alarm_cooldown': '60',
    
    // 海康威视配置
    'hikvision.app_key': '',
    'hikvision.app_secret': '',
    'hikvision.host': 'https://api.hik-cloud.com',
  };

  // 获取配置
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const response = await axios.get(`${API_URL}/configs`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const configMap: Record<string, string> = { ...defaultConfigs };
        response.data.forEach((item: SystemConfig) => {
          configMap[item.key] = item.value;
        });
        setConfigs(configMap);
      } catch (error) {
        console.error('Failed to fetch configs:', error);
        toast.error('获取系统配置失败');
      }
    };

    if (token) {
      fetchConfigs();
    }
  }, [token]);

  const handleSave = async (category: string) => {
    setIsLoading(true);
    try {
      // 筛选出当前分类的配置项进行保存
      const updates = Object.entries(configs).filter(([key]) => key.startsWith(category));
      
      for (const [key, value] of updates) {
        // 检查配置是否存在，不存在则创建，存在则更新
        try {
          // 尝试创建
          await axios.post(`${API_URL}/configs`, {
            key,
            value: String(value),
            category,
            is_secret: key.includes('secret') || key.includes('key') || key.includes('webhook')
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (error: any) {
          if (error.response?.status === 400) {
            // 已存在，执行更新
            await axios.put(`${API_URL}/configs/${key}`, {
              value: String(value)
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });
          } else {
            throw error;
          }
        }
      }
      
      toast.success('配置已保存');
    } catch (error) {
      console.error('Failed to save configs:', error);
      toast.error('保存配置失败');
    } finally {
      setIsLoading(false);
    }
  };

  const updateConfig = (key: string, value: string | boolean) => {
    setConfigs(prev => ({
      ...prev,
      [key]: String(value)
    }));
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-display font-bold tracking-tight">系统配置</h2>
          <p className="text-muted-foreground">管理系统参数、API 凭证和通知设置</p>
        </div>

        <Tabs defaultValue="ai" className="space-y-4">
          <TabsList>
            <TabsTrigger value="ai">AI 模型参数</TabsTrigger>
            <TabsTrigger value="hikvision">海康威视 API</TabsTrigger>
            <TabsTrigger value="notification">钉钉通知</TabsTrigger>
            <TabsTrigger value="system">系统维护</TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="w-5 h-5 mr-2 text-primary" />
                  推理参数配置
                </CardTitle>
                <CardDescription>
                  调整 AI 模型的推理性能和检测阈值
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fps">推理帧率 (FPS)</Label>
                    <Input 
                      id="fps" 
                      type="number" 
                      value={configs['ai.inference_fps']}
                      onChange={e => updateConfig('ai.inference_fps', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">建议值: 5-10 FPS，过高会增加 GPU 负载</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confidence">置信度阈值</Label>
                    <Input 
                      id="confidence" 
                      type="number" 
                      step="0.1" 
                      min="0" 
                      max="1"
                      value={configs['ai.confidence_threshold']}
                      onChange={e => updateConfig('ai.confidence_threshold', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">范围 0.0-1.0，低于此值的检测结果将被忽略</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="track">追踪保留帧数</Label>
                    <Input 
                      id="track" 
                      type="number" 
                      value={configs['ai.track_max_age']}
                      onChange={e => updateConfig('ai.track_max_age', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">目标丢失多少帧后删除 ID</p>
                  </div>
                </div>

                <Separator className="my-4" />
                
                {permissions['config:update'] && (
                  <div className="flex justify-end">
                    <Button onClick={() => handleSave('ai')} disabled={isLoading}>
                      {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      保存配置
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hikvision" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Camera className="w-5 h-5 mr-2 text-primary" />
                  海康威视 API 配置
                </CardTitle>
                <CardDescription>
                  配置海康威视综合安防管理平台 API 凭证，用于获取摄像头流地址
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="hik_host">平台地址 (Host)</Label>
                    <Input 
                      id="hik_host" 
                      placeholder="https://api.hik-cloud.com"
                      value={configs['hikvision.host']}
                      onChange={e => updateConfig('hikvision.host', e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="hik_key">App Key</Label>
                      <Input 
                        id="hik_key" 
                        type="password"
                        value={configs['hikvision.app_key']}
                        onChange={e => updateConfig('hikvision.app_key', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="hik_secret">App Secret</Label>
                      <Input 
                        id="hik_secret" 
                        type="password"
                        value={configs['hikvision.app_secret']}
                        onChange={e => updateConfig('hikvision.app_secret', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />
                
                {permissions['config:update'] && (
                  <div className="flex justify-end">
                    <Button onClick={() => handleSave('notification')} disabled={isLoading}>
                      <Save className="w-4 h-4 mr-2" />
                      保存配置
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notification" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="w-5 h-5 mr-2 text-primary" />
                  钉钉通知配置
                </CardTitle>
                <CardDescription>
                  配置报警消息推送到钉钉群机器人
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">启用钉钉通知</Label>
                    <p className="text-sm text-muted-foreground">
                      开启后，严重报警将实时推送到指定群组
                    </p>
                  </div>
                  <Switch 
                    checked={configs['dingtalk.enabled'] === 'true'}
                    onCheckedChange={c => updateConfig('dingtalk.enabled', c)}
                  />
                </div>
                
                {configs['dingtalk.enabled'] === 'true' && (
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="webhook">Webhook 地址</Label>
                      <Input 
                        id="webhook" 
                        placeholder="https://oapi.dingtalk.com/robot/send?access_token=..."
                        value={configs['dingtalk.webhook']}
                        onChange={e => updateConfig('dingtalk.webhook', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dt_secret">加签密钥 (Secret)</Label>
                      <Input 
                        id="dt_secret" 
                        type="password"
                        placeholder="SEC..."
                        value={configs['dingtalk.secret']}
                        onChange={e => updateConfig('dingtalk.secret', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">钉钉机器人安全设置中选择"加签"时生成的密钥</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-4">
                  <Label htmlFor="cooldown">报警冷却时间 (秒)</Label>
                  <Input 
                    id="cooldown" 
                    type="number"
                    value={configs['dingtalk.alarm_cooldown']}
                    onChange={e => updateConfig('dingtalk.alarm_cooldown', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">同一目标的重复报警间隔时间</p>
                </div>

                <Separator className="my-4" />
                
                <div className="flex justify-end">
                  <Button onClick={() => handleSave('dingtalk')} disabled={isLoading}>
                    <Save className="w-4 h-4 mr-2" />
                    保存配置
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-primary" />
                  系统维护
                </CardTitle>
                <CardDescription>
                  数据库备份、日志清理和系统重置
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline" className="h-24 flex flex-col items-center justify-center space-y-2">
                    <Database className="w-8 h-8 text-muted-foreground" />
                    <span>备份数据库</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex flex-col items-center justify-center space-y-2">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span>导出日志</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex flex-col items-center justify-center space-y-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50">
                    <RefreshCw className="w-8 h-8" />
                    <span>重启服务</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
