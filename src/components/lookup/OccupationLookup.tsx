import { useState, useEffect } from 'react';
import { Search, Loader2, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { loadOccupations, loadOnetOccupations, loadCrosswalk, searchOccupations, getOnetCodesForSoc } from '@/lib/dataLoader';
import type { OccupationCode, OnetOccupation, CrosswalkEntry } from '@/types/paf';

export function OccupationLookup() {
  const [occupations, setOccupations] = useState<OccupationCode[]>([]);
  const [crosswalk, setCrosswalk] = useState<CrosswalkEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<OccupationCode[]>([]);
  const [selectedOcc, setSelectedOcc] = useState<OccupationCode | null>(null);
  const [relatedOnet, setRelatedOnet] = useState<CrosswalkEntry[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [occs, xwalk] = await Promise.all([
          loadOccupations(),
          loadCrosswalk(),
        ]);
        setOccupations(occs);
        setCrosswalk(xwalk);
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
          <span className="ml-3 text-muted-foreground">Loading occupation database...</span>
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

              {relatedOnet.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    Related O*NET Occupations ({relatedOnet.length})
                  </h4>
                  <div className="space-y-2">
                    {relatedOnet.map((onet) => (
                      <div
                        key={onet.onetCode}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border"
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
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
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
