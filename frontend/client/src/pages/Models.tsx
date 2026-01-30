import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Brain, Upload, Play, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { API_URL, useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface AIModel {
  id: number;
  name: string;
  version: string;
  format: string;
  description: string;
  is_active: boolean;
  file_path: string;
  created_at: string;
}

export default function Models() {
  const { token } = useAuth();
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [modelInfo, setModelInfo] = useState({
    name: '',
    version: '1.0.0',
    description: ''
  });

  const fetchModels = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/ai-models`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setModels(response.data);
    } catch (error) {
      console.error('Failed to fetch models:', error);
      toast.error('获取模型列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchModels();
  }, [token]);

  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error('请选择模型文件');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('name', modelInfo.name);
    formData.append('version', modelInfo.version);
    formData.append('description', modelInfo.description);

    try {
      await axios.post(`${API_URL}/ai-models/upload`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success('模型上传成功');
      setIsDialogOpen(false);
      fetchModels();
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('上传失败');
    }
  };

  const handleActivate = async (id: number) => {
    try {
      await axios.post(`${API_URL}/ai-models/${id}/activate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('模型已激活');
      fetchModels();
    } catch (error) {
      toast.error('激活失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个模型吗？')) return;
    try {
      await axios.delete(`${API_URL}/ai-models/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('模型已删除');
      fetchModels();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-display font-bold tracking-tight">AI 模型管理</h2>
            <p className="text-muted-foreground">上传和管理用于人员检测的 AI 模型</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            上传模型
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">当前模型</CardTitle>
              <Brain className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {models.find(m => m.is_active)?.name || '未激活'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                版本: {models.find(m => m.is_active)?.version || '-'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">可用模型数</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{models.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">支持格式</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">.pt / .onnx</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>模型列表</CardTitle>
            <CardDescription>
              管理已上传的模型文件，同一时间只能激活一个模型
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>版本</TableHead>
                  <TableHead>格式</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead>上传时间</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      暂无模型文件
                    </TableCell>
                  </TableRow>
                ) : (
                  models.map(model => (
                    <TableRow key={model.id}>
                      <TableCell className="font-medium flex items-center">
                        <Brain className="w-4 h-4 mr-2 text-muted-foreground" />
                        {model.name}
                      </TableCell>
                      <TableCell>{model.version}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase">
                          {model.format}
                        </Badge>
                      </TableCell>
                      <TableCell>{model.description}</TableCell>
                      <TableCell>{format(new Date(model.created_at), 'yyyy-MM-dd')}</TableCell>
                      <TableCell>
                        <Badge variant={model.is_active ? 'default' : 'secondary'}>
                          {model.is_active ? '使用中' : '闲置'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!model.is_active && (
                            <Button size="sm" variant="ghost" onClick={() => handleActivate(model.id)}>
                              <Play className="w-4 h-4 mr-1" />
                              激活
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(model.id)}>
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
              <DialogTitle>上传新模型</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>模型名称</Label>
                <Input 
                  value={modelInfo.name} 
                  onChange={e => setModelInfo({...modelInfo, name: e.target.value})}
                  placeholder="例如: yolo_v8_person_det"
                />
              </div>
              <div className="space-y-2">
                <Label>版本号</Label>
                <Input 
                  value={modelInfo.version} 
                  onChange={e => setModelInfo({...modelInfo, version: e.target.value})}
                  placeholder="1.0.0"
                />
              </div>
              <div className="space-y-2">
                <Label>描述</Label>
                <Input 
                  value={modelInfo.description} 
                  onChange={e => setModelInfo({...modelInfo, description: e.target.value})}
                  placeholder="模型用途说明"
                />
              </div>
              <div className="space-y-2">
                <Label>模型文件 (.pt, .onnx)</Label>
                <Input 
                  type="file"
                  accept=".pt,.onnx"
                  onChange={e => setUploadFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>取消</Button>
              <Button onClick={handleUpload}>上传</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
