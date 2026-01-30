import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Book, List, Settings } from 'lucide-react';
import { API_URL, useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

interface DictType {
  id: number;
  code: string;
  name: string;
  description: string;
  is_system: boolean;
}

interface DictItem {
  id: number;
  type_id: number;
  label: string;
  value: string;
  sort_order: number;
  is_active: boolean;
  description: string;
}

export default function Dictionaries() {
  const { token } = useAuth();
  const [types, setTypes] = useState<DictType[]>([]);
  const [items, setItems] = useState<DictItem[]>([]);
  const [selectedType, setSelectedType] = useState<DictType | null>(null);
  
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  
  const [currentType, setCurrentType] = useState<Partial<DictType>>({});
  const [currentItem, setCurrentItem] = useState<Partial<DictItem>>({});

  // 加载字典类型
  const fetchTypes = async () => {
    try {
      const response = await axios.get(`${API_URL}/dictionaries/types`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTypes(response.data);
      if (response.data.length > 0 && !selectedType) {
        setSelectedType(response.data[0]);
      }
    } catch (error) {
      toast.error('获取字典类型失败');
    }
  };

  // 加载字典项
  const fetchItems = async (typeCode: string) => {
    try {
      const response = await axios.get(`${API_URL}/dictionaries/types/${typeCode}/items`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(response.data);
    } catch (error) {
      toast.error('获取字典项失败');
    }
  };

  useEffect(() => {
    if (token) fetchTypes();
  }, [token]);

  useEffect(() => {
    if (selectedType && token) {
      fetchItems(selectedType.code);
    }
  }, [selectedType, token]);

  // 类型操作
  const handleSaveType = async () => {
    try {
      // 目前只支持创建，不支持编辑类型（简化逻辑）
      await axios.post(`${API_URL}/dictionaries/types`, currentType, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('字典类型已创建');
      setIsTypeDialogOpen(false);
      fetchTypes();
    } catch (error) {
      toast.error('保存失败');
    }
  };

  const handleDeleteType = async (id: number) => {
    if (!confirm('确定要删除这个字典类型吗？所有关联项也将被删除。')) return;
    try {
      await axios.delete(`${API_URL}/dictionaries/types/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('字典类型已删除');
      fetchTypes();
      setSelectedType(null);
      setItems([]);
    } catch (error) {
      toast.error('删除失败，系统内置类型不可删除');
    }
  };

  // 字典项操作
  const handleSaveItem = async () => {
    if (!selectedType) return;
    try {
      if (currentItem.id) {
        await axios.put(`${API_URL}/dictionaries/items/${currentItem.id}`, currentItem, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('字典项已更新');
      } else {
        await axios.post(`${API_URL}/dictionaries/types/${selectedType.id}/items`, currentItem, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('字典项已添加');
      }
      setIsItemDialogOpen(false);
      fetchItems(selectedType.code);
    } catch (error) {
      toast.error('保存失败');
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm('确定要删除这个字典项吗？')) return;
    try {
      await axios.delete(`${API_URL}/dictionaries/items/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('字典项已删除');
      if (selectedType) fetchItems(selectedType.code);
    } catch (error) {
      toast.error('删除失败');
    }
  };

  return (
    <Layout>
      <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-display font-bold tracking-tight">数据字典</h2>
            <p className="text-muted-foreground">管理系统通用的配置参数和选项</p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
          {/* 左侧：字典类型列表 */}
          <Card className="col-span-4 flex flex-col h-full">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">字典类型</CardTitle>
                <Button size="sm" variant="outline" onClick={() => { setCurrentType({}); setIsTypeDialogOpen(true); }}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
              <div className="divide-y divide-border">
                {types.map(type => (
                  <div 
                    key={type.id}
                    className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors flex justify-between items-center ${selectedType?.id === type.id ? 'bg-muted border-l-4 border-l-primary' : ''}`}
                    onClick={() => setSelectedType(type)}
                  >
                    <div>
                      <div className="font-medium flex items-center">
                        {type.name}
                        {type.is_system && <Badge variant="secondary" className="ml-2 text-[10px] h-5">系统</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 font-mono">{type.code}</div>
                    </div>
                    {!type.is_system && (
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDeleteType(type.id); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 右侧：字典项列表 */}
          <Card className="col-span-8 flex flex-col h-full">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">{selectedType ? selectedType.name : '请选择类型'}</CardTitle>
                  <CardDescription>{selectedType?.description || '选择左侧类型以管理具体选项'}</CardDescription>
                </div>
                {selectedType && (
                  <Button size="sm" onClick={() => { setCurrentItem({ sort_order: 0, is_active: true }); setIsItemDialogOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    添加选项
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
              {selectedType ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>显示名称 (Label)</TableHead>
                      <TableHead>存储值 (Value)</TableHead>
                      <TableHead>排序</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          暂无数据项
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.label}</TableCell>
                          <TableCell className="font-mono text-xs">{item.value}</TableCell>
                          <TableCell>{item.sort_order}</TableCell>
                          <TableCell>
                            <Badge variant={item.is_active ? 'default' : 'secondary'}>
                              {item.is_active ? '启用' : '禁用'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => { setCurrentItem(item); setIsItemDialogOpen(true); }}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeleteItem(item.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Book className="w-12 h-12 mb-4 opacity-20" />
                  <p>请从左侧选择一个字典类型</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 类型对话框 */}
        <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建字典类型</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>类型名称</Label>
                <Input 
                  placeholder="例如：摄像头类型"
                  value={currentType.name || ''} 
                  onChange={e => setCurrentType({...currentType, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>类型编码 (唯一)</Label>
                <Input 
                  placeholder="例如：camera_type"
                  value={currentType.code || ''} 
                  onChange={e => setCurrentType({...currentType, code: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>描述</Label>
                <Input 
                  value={currentType.description || ''} 
                  onChange={e => setCurrentType({...currentType, description: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTypeDialogOpen(false)}>取消</Button>
              <Button onClick={handleSaveType}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 字典项对话框 */}
        <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{currentItem.id ? '编辑选项' : '添加选项'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>显示名称</Label>
                <Input 
                  placeholder="例如：枪机"
                  value={currentItem.label || ''} 
                  onChange={e => setCurrentItem({...currentItem, label: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>存储值</Label>
                <Input 
                  placeholder="例如：bullet"
                  value={currentItem.value || ''} 
                  onChange={e => setCurrentItem({...currentItem, value: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>排序 (越小越前)</Label>
                  <Input 
                    type="number"
                    value={currentItem.sort_order || 0} 
                    onChange={e => setCurrentItem({...currentItem, sort_order: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2 flex items-end pb-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="checkbox"
                      checked={currentItem.is_active !== false}
                      onChange={e => setCurrentItem({...currentItem, is_active: e.target.checked})}
                    />
                    <span className="text-sm font-medium">启用该选项</span>
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsItemDialogOpen(false)}>取消</Button>
              <Button onClick={handleSaveItem}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
