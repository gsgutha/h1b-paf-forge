import { FileText, FolderOpen, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentPAFs } from '@/components/dashboard/RecentPAFs';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const EMPLOYER_NAME = 'Sai Business Solutions LLC';

const Index = () => {
  // Fetch stats from lca_disclosure for Sai Business Solutions LLC
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats', EMPLOYER_NAME],
    queryFn: async () => {
      // Get PAF records count
      const { count: pafCount } = await supabase
        .from('paf_records')
        .select('*', { count: 'exact', head: true });

      // Get Active LCAs (certified, not yet PAF generated)
      const { count: activeLcaCount } = await supabase
        .from('lca_disclosure')
        .select('*', { count: 'exact', head: true })
        .eq('employer_name', EMPLOYER_NAME)
        .eq('paf_generated', false)
        .ilike('case_status', '%certified%');

      // Get Generated PAFs from LCA disclosure
      const { count: generatedPafCount } = await supabase
        .from('lca_disclosure')
        .select('*', { count: 'exact', head: true })
        .eq('employer_name', EMPLOYER_NAME)
        .eq('paf_generated', true);

      // Get total LCAs for this employer
      const { count: totalLcaCount } = await supabase
        .from('lca_disclosure')
        .select('*', { count: 'exact', head: true })
        .eq('employer_name', EMPLOYER_NAME);

      return {
        totalPafs: generatedPafCount || 0,
        activeLcas: activeLcaCount || 0,
        totalLcas: totalLcaCount || 0,
      };
    },
  });

  return (
    <Layout>
      {/* Hero Section */}
      <section className="hero-gradient py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-primary-foreground/90 mb-6">
              <CheckCircle2 className="h-4 w-4" />
              <span>Official FLAG.gov Data Integration</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-6 leading-tight">
              H-1B Public Access File Generator
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 leading-relaxed">
              Create compliant PAF documentation with ease. Access SOC codes, prevailing wage data, 
              and geographic areas directly from official sources.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/create">
                <Button variant="hero" size="xl">
                  Create New PAF
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/lookup">
                <Button variant="nav" size="xl" className="border border-white/20">
                  Lookup Occupations
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Generated PAFs"
              value={stats?.totalPafs ?? 0}
              description="Public Access Files created"
              icon={FileText}
            />
            <StatsCard
              title="Active LCAs"
              value={stats?.activeLcas ?? 0}
              description="Ready for PAF generation"
              icon={CheckCircle2}
            />
            <StatsCard
              title="Total LCAs"
              value={stats?.totalLcas ?? 0}
              description="Sai Business Solutions LLC"
              icon={Clock}
            />
            <StatsCard
              title="Occupations"
              value="848+"
              description="SOC codes available"
              icon={FolderOpen}
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RecentPAFs />
            </div>
            <div>
              <QuickActions />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Everything You Need for PAF Compliance
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Streamline your H-1B documentation process with built-in data from official sources.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="paf-section text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10 mb-4">
                <FileText className="h-7 w-7 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                SOC/ONET Codes
              </h3>
              <p className="text-muted-foreground">
                Search and select from 848+ OES occupation codes with detailed descriptions and O*NET crosswalks.
              </p>
            </div>

            <div className="paf-section text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10 mb-4">
                <CheckCircle2 className="h-7 w-7 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Geographic Areas
              </h3>
              <p className="text-muted-foreground">
                Access complete MSA and non-metropolitan area data with county-level wage area mapping.
              </p>
            </div>

            <div className="paf-section text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10 mb-4">
                <FolderOpen className="h-7 w-7 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Wage Compliance
              </h3>
              <p className="text-muted-foreground">
                Built-in wage level validation ensures your offered wage meets prevailing wage requirements.
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
