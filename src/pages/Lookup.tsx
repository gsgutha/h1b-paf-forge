import { Layout } from '@/components/layout/Layout';
import { OccupationLookup } from '@/components/lookup/OccupationLookup';

export default function Lookup() {
  return (
    <Layout>
      <div className="bg-muted/30 py-8 border-b border-border">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-foreground">Occupation Lookup</h1>
          <p className="mt-2 text-muted-foreground">
            Search SOC/ONET occupation codes from official BLS and O*NET databases
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <OccupationLookup />
      </div>
    </Layout>
  );
}
