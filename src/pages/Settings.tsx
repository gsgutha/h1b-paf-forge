import { useState, useRef } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  useSignatories, 
  useCreateSignatory, 
  useUpdateSignatory,
  useDeleteSignatory,
  useSetDefaultSignatory,
  useUploadSignatureImage,
  useRemoveSignatureImage,
  type Signatory
} from '@/hooks/useSignatories';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Upload, 
  Star,
  X,
  Settings as SettingsIcon,
  UserPen
} from 'lucide-react';

export default function Settings() {
  const { data: signatories, isLoading } = useSignatories();
  const createSignatory = useCreateSignatory();
  const updateSignatory = useUpdateSignatory();
  const deleteSignatory = useDeleteSignatory();
  const setDefault = useSetDefaultSignatory();
  const uploadImage = useUploadSignatureImage();
  const removeImage = useRemoveSignatureImage();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSignatory, setEditingSignatory] = useState<Signatory | null>(null);
  const [newName, setNewName] = useState('');
  const [newTitle, setNewTitle] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const handleAddSignatory = async () => {
    if (!newName.trim() || !newTitle.trim()) return;
    
    await createSignatory.mutateAsync({
      name: newName.trim(),
      title: newTitle.trim(),
    });
    
    setNewName('');
    setNewTitle('');
    setIsAddDialogOpen(false);
  };

  const handleUpdateSignatory = async () => {
    if (!editingSignatory || !newName.trim() || !newTitle.trim()) return;
    
    await updateSignatory.mutateAsync({
      id: editingSignatory.id,
      name: newName.trim(),
      title: newTitle.trim(),
    });
    
    setEditingSignatory(null);
    setNewName('');
    setNewTitle('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return;
    }

    await uploadImage.mutateAsync({ id, file });
    setUploadingId(null);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startEdit = (signatory: Signatory) => {
    setEditingSignatory(signatory);
    setNewName(signatory.name);
    setNewTitle(signatory.title);
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage authorized signatories and preferences</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPen className="h-5 w-5 text-primary" />
                <CardTitle>Authorized Signatories</CardTitle>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Signatory
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Signatory</DialogTitle>
                    <DialogDescription>
                      Add a new authorized signatory for PAF documents
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Enter full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="e.g., Director of Operations"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAddSignatory}
                      disabled={!newName.trim() || !newTitle.trim() || createSignatory.isPending}
                    >
                      {createSignatory.isPending ? 'Adding...' : 'Add Signatory'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <CardDescription>
              Manage individuals authorized to sign PAF documents. Upload signature images for digital signing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                    <Skeleton className="h-16 w-32" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : signatories && signatories.length > 0 ? (
              <div className="space-y-4">
                {signatories.map((signatory) => (
                  <div 
                    key={signatory.id} 
                    className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {/* Signature Preview */}
                    <div className="w-40 h-20 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden">
                      {signatory.signature_image_path ? (
                        <img 
                          src={signatory.signature_image_path} 
                          alt={`${signatory.name}'s signature`}
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground text-center px-2">
                          No signature uploaded
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{signatory.name}</h3>
                        {signatory.is_default && (
                          <Badge variant="secondary" className="shrink-0">
                            <Star className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{signatory.title}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        ref={uploadingId === signatory.id ? fileInputRef : undefined}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id={`upload-${signatory.id}`}
                        onChange={(e) => handleFileUpload(e, signatory.id)}
                      />
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setUploadingId(signatory.id);
                          document.getElementById(`upload-${signatory.id}`)?.click();
                        }}
                        disabled={uploadImage.isPending}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        {signatory.signature_image_path ? 'Replace' : 'Upload'}
                      </Button>

                      {signatory.signature_image_path && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeImage.mutate(signatory.id)}
                          disabled={removeImage.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}

                      {!signatory.is_default && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDefault.mutate(signatory.id)}
                          disabled={setDefault.isPending}
                          title="Set as default"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}

                      <Dialog 
                        open={editingSignatory?.id === signatory.id} 
                        onOpenChange={(open) => !open && setEditingSignatory(null)}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEdit(signatory)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Signatory</DialogTitle>
                            <DialogDescription>
                              Update signatory information
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-name">Full Name</Label>
                              <Input
                                id="edit-name"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-title">Title</Label>
                              <Input
                                id="edit-title"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingSignatory(null)}>
                              Cancel
                            </Button>
                            <Button 
                              onClick={handleUpdateSignatory}
                              disabled={!newName.trim() || !newTitle.trim() || updateSignatory.isPending}
                            >
                              {updateSignatory.isPending ? 'Saving...' : 'Save Changes'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Signatory?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove {signatory.name} from the authorized signatories list.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteSignatory.mutate(signatory.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <UserPen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No signatories configured</p>
                <p className="text-sm">Add your first authorized signatory to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
