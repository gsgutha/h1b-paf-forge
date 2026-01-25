import { useState, useEffect } from 'react';
import { Search, Loader2, ExternalLink, GraduationCap, FlaskConical, Briefcase } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  loadOccupations, 
  loadCrosswalk, 
  loadEducationRequirements,
  loadACWIACrosswalk,
  searchOccupations, 
  getOnetCodesForSoc,
  getEducationForOnet,
  getACWIAForOnet 
} from '@/lib/dataLoader';
import type { OccupationCode, CrosswalkEntry, EducationRequirement, ACWIACrosswalk } from '@/types/paf';

export function OccupationLookup() {
  const [occupations, setOccupations] = useState<OccupationCode[]>([]);
  const [crosswalk, setCrosswalk] = useState<CrosswalkEntry[]>([]);
  const [education, setEducation] = useState<EducationRequirement[]>([]);
  const [acwia, setACWIA] = useState<ACWIACrosswalk[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<OccupationCode[]>([]);
  const [selectedOcc, setSelectedOcc] = useState<OccupationCode | null>(null);
  const [relatedOnet, setRelatedOnet] = useState<CrosswalkEntry[]>([]);
  const [selectedOnetEducation, setSelectedOnetEducation] = useState<EducationRequirement | null>(null);
  const [selectedOnetACWIA, setSelectedOnetACWIA] = useState<ACWIACrosswalk[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [occs, xwalk, edu, acwiaData] = await Promise.all([
          loadOccupations(),
          loadCrosswalk(),
          loadEducationRequirements(),
          loadACWIACrosswalk(),
        ]);
        setOccupations(occs);
        setCrosswalk(xwalk);
        setEducation(edu);
        setACWIA(acwiaData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const searchResults = searchOccupations(occupations, searchQuery);
      setResults(searchResults);
    } else {
      setResults([]);
    }
  }, [searchQuery, occupations]);

  const handleSelect = (occ: OccupationCode) => {
    setSelectedOcc(occ);
    const onetCodes = getOnetCodesForSoc(crosswalk, occ.socCode);
    setRelatedOnet(onetCodes);
    
    // Get education for first ONET code
    if (onetCodes.length > 0) {
      const eduReq = getEducationForOnet(education, onetCodes[0].onetCode);
      setSelectedOnetEducation(eduReq || null);
      const acwiaEntries = getACWIAForOnet(acwia, onetCodes[0].onetCode);
      setSelectedOnetACWIA(acwiaEntries);
    } else {
      setSelectedOnetEducation(null);
      setSelectedOnetACWIA([]);
    }
  };

  const handleOnetSelect = (onetCode: string) => {
    const eduReq = getEducationForOnet(education, onetCode);
    setSelectedOnetEducation(eduReq || null);
    const acwiaEntries = getACWIAForOnet(acwia, onetCode);
    setSelectedOnetACWIA(acwiaEntries);
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by SOC code, title, or keywords..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-12 text-base"
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <span className="ml-3 text-muted-foreground">Loading FLAG.gov occupation database...</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Search Results */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            {results.length > 0 
              ? `Search Results (${results.length})`
              : searchQuery.length >= 2 
                ? 'No results found' 
                : 'Start typing to search'
            }
          </h3>
          
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {results.map((occ) => (
              <button
                key={occ.socCode}
                onClick={() => handleSelect(occ)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  selectedOcc?.socCode === occ.socCode
                    ? 'border-accent bg-accent/5 shadow-sm'
                    : 'border-border hover:border-accent/50 hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="font-mono shrink-0">
                    {occ.socCode}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{occ.title}</p>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {occ.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail View */}
        {selectedOcc && (
          <div className="paf-section slide-up">
            <div className="space-y-6">
              <div>
                <Badge variant="secondary" className="mb-3 font-mono text-base px-3 py-1">
                  {selectedOcc.socCode}
                </Badge>
                <h2 className="text-2xl font-bold text-foreground">{selectedOcc.title}</h2>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
                <p className="text-foreground">{selectedOcc.description}</p>
              </div>

              {/* Education Requirement */}
              {selectedOnetEducation && (
                <div className="rounded-lg bg-accent/5 p-4 border border-accent/20">
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap className="h-5 w-5 text-accent" />
                    <h4 className="font-medium text-foreground">Education Requirement</h4>
                  </div>
                  <p className="text-foreground font-semibold">{selectedOnetEducation.education}</p>
                  <p className="text-xs text-muted-foreground mt-1">Source: {selectedOnetEducation.source}</p>
                </div>
              )}

              {/* ACWIA R&D Classification */}
              {selectedOnetACWIA.length > 0 && (
                <div className="rounded-lg bg-warning/5 p-4 border border-warning/20">
                  <div className="flex items-center gap-2 mb-2">
                    <FlaskConical className="h-5 w-5 text-warning" />
                    <h4 className="font-medium text-foreground">ACWIA Classification</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    This occupation has special R&D/Non-R&D wage classifications for ACWIA Higher Education purposes.
                  </p>
                  <div className="space-y-2">
                    {selectedOnetACWIA.map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <Badge 
                          variant="outline" 
                          className={`font-mono text-xs ${
                            entry.acwiaTitle.includes('R&D') 
                              ? 'border-warning/50 bg-warning/10 text-warning' 
                              : 'border-muted'
                          }`}
                        >
                          {entry.acwiaCode}
                        </Badge>
                        <span className="text-foreground">{entry.acwiaTitle}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {relatedOnet.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    Related O*NET Occupations ({relatedOnet.length})
                  </h4>
                  <div className="space-y-2">
                    {relatedOnet.map((onet) => (
                      <button
                        key={onet.onetCode}
                        onClick={() => handleOnetSelect(onet.onetCode)}
                        className="flex w-full items-center justify-between p-3 rounded-lg bg-muted/50 border border-border hover:border-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-mono text-xs">
                            {onet.onetCode}
                          </Badge>
                          <span className="text-sm font-medium">{onet.onetTitle}</span>
                        </div>
                        <a
                          href={`https://www.onetonline.org/link/summary/${onet.onetCode}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:text-accent/80 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-border">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Useful Links</h4>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`https://www.bls.gov/oes/current/oes${selectedOcc.socCode.replace('-', '')}.htm`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
                  >
                    BLS OES Data <ExternalLink className="h-3 w-3" />
                  </a>
                  <span className="text-muted-foreground">•</span>
                  <a
                    href="https://flag.dol.gov/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
                  >
                    FLAG.gov <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
