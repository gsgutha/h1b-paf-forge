import { Layout } from '@/components/layout/Layout';
import { OccupationLookup } from '@/components/lookup/OccupationLookup';
import { LCALookup } from '@/components/lookup/LCALookup';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Briefcase, FileText } from 'lucide-react';

export default function Lookup() {
  return (
    <Layout>
      <div className="bg-muted/30 py-8 border-b border-border">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-foreground">Data Lookup</h1>
          <p className="mt-2 text-muted-foreground">
            Search occupation codes and LCA disclosure records
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="occupation" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="occupation" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Occupation Codes
            </TabsTrigger>
            <TabsTrigger value="lca" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              LCA History
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="occupation">
            <OccupationLookup />
          </TabsContent>
          
          <TabsContent value="lca">
            <LCALookup />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
