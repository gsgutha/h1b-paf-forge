import { Layout } from '@/components/layout/Layout';
import { PAFWizard } from '@/components/wizard/PAFWizard';

export default function CreateManualPAF() {
  return (
    <Layout>
      <div className="bg-muted/30 py-8 border-b border-border">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-foreground">Manual PAF Entry</h1>
          <p className="mt-2 text-muted-foreground">
            Manually enter LCA and employer details to generate a compliant H-1B PAF document
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <PAFWizard mode="manual" />
      </div>
    </Layout>
  );
}
