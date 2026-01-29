import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Signatory {
  id: string;
  name: string;
  title: string;
  signature_image_path: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function useSignatories() {
  return useQuery({
    queryKey: ['signatories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('authorized_signatories')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;
      return data as Signatory[];
    },
  });
}

export function useDefaultSignatory() {
  return useQuery({
    queryKey: ['signatories', 'default'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('authorized_signatories')
        .select('*')
        .eq('is_default', true)
        .single();

      if (error) throw error;
      return data as Signatory;
    },
  });
}

export function useSignatoryById(id: string | undefined) {
  return useQuery({
    queryKey: ['signatories', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('authorized_signatories')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Signatory;
    },
    enabled: !!id,
  });
}

export function useCreateSignatory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (signatory: { name: string; title: string; is_default?: boolean }) => {
      const { data, error } = await supabase
        .from('authorized_signatories')
        .insert(signatory)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signatories'] });
      toast({ title: 'Signatory added successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Error adding signatory', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useUpdateSignatory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Signatory> & { id: string }) => {
      const { data, error } = await supabase
        .from('authorized_signatories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signatories'] });
      toast({ title: 'Signatory updated successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Error updating signatory', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useDeleteSignatory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('authorized_signatories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signatories'] });
      toast({ title: 'Signatory deleted successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Error deleting signatory', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useSetDefaultSignatory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // First, unset all defaults
      await supabase
        .from('authorized_signatories')
        .update({ is_default: false })
        .neq('id', id);

      // Then set the new default
      const { data, error } = await supabase
        .from('authorized_signatories')
        .update({ is_default: true })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signatories'] });
      toast({ title: 'Default signatory updated' });
    },
    onError: (error) => {
      toast({ 
        title: 'Error setting default', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useUploadSignatureImage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${id}.${fileExt}`;
      const filePath = `signatures/${fileName}`;

      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('signatures')
        .getPublicUrl(fileName);

      // Update the signatory record
      const { data, error } = await supabase
        .from('authorized_signatories')
        .update({ signature_image_path: publicUrl })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signatories'] });
      toast({ title: 'Signature image uploaded successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Error uploading signature', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useRemoveSignatureImage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Update the signatory record to remove path
      const { data, error } = await supabase
        .from('authorized_signatories')
        .update({ signature_image_path: null })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signatories'] });
      toast({ title: 'Signature image removed' });
    },
    onError: (error) => {
      toast({ 
        title: 'Error removing signature', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}
