import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Building2, FileText, MapPin, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LCARecord {
  id: string;
  case_number: string;
  case_status: string;
  employer_name: string;
  employer_city: string | null;
  employer_state: string | null;
  job_title: string | null;
  soc_code: string | null;
  soc_title: string | null;
  wage_rate_from: number | null;
  wage_rate_to: number | null;
  wage_unit: string | null;
  prevailing_wage: number | null;
  pw_wage_level: string | null;
  worksite_city: string | null;
  worksite_state: string | null;
  begin_date: string | null;
  decision_date: string | null;
  visa_class: string;
  h1b_dependent: boolean | null;
  total_workers: number | null;
}

export function LCALookup() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: results, isLoading, error } = useQuery({
    queryKey: ["lca-lookup", searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      
      // Escape special ILIKE characters to prevent injection
      const escaped = searchQuery.replace(/[%_\\]/g, '\\$&');
      
      const { data, error } = await supabase
        .from("lca_disclosure")
        .select("*")
        .or(`employer_name.ilike.%${escaped}%,case_number.ilike.%${escaped}%`)
        .order("decision_date", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as LCARecord[];
    },
    enabled: searchQuery.length >= 2,
  });

  const handleSearch = () => {
    setSearchQuery(searchTerm);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const formatCurrency = (amount: number | null, unit: string | null) => {
    if (amount === null) return "N/A";
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
    
    if (unit) {
      const unitLabel = unit.toLowerCase().includes("year") ? "/yr" : 
                        unit.toLowerCase().includes("hour") ? "/hr" : 
                        unit.toLowerCase().includes("month") ? "/mo" : "";
      return `${formatted}${unitLabel}`;
    }
    return formatted;
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes("certified")) {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Certified</Badge>;
    } else if (statusLower.includes("denied")) {
      return <Badge variant="destructive">Denied</Badge>;
    } else if (statusLower.includes("withdrawn")) {
      return <Badge variant="secondary">Withdrawn</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          LCA Disclosure Lookup
        </CardTitle>
        <CardDescription>
          Search for Labor Condition Applications by employer name or case number
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Enter employer name (e.g., Sai Business Solutions LLC) or case number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9"
            />
          </div>
          <Button onClick={handleSearch} disabled={searchTerm.length < 2}>
            Search
          </Button>
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-destructive">
            Error loading results. Please try again.
          </div>
        )}

        {results && results.length === 0 && searchQuery && !isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No LCA records found for "{searchQuery}"</p>
            <p className="text-sm mt-1">Try a different employer name or case number</p>
          </div>
        )}

        {results && results.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Found {results.length} record{results.length !== 1 ? "s" : ""}
              {results.length === 100 && " (showing first 100)"}
            </p>
            
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Employer</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>SOC Code</TableHead>
                    <TableHead>Worksite</TableHead>
                    <TableHead>Wage Offered</TableHead>
                    <TableHead>Prevailing Wage</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Decision Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono text-xs">
                        {record.case_number}
                      </TableCell>
                      <TableCell>{getStatusBadge(record.case_status)}</TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="font-medium truncate">{record.employer_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {record.employer_city}, {record.employer_state}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[150px]">
                        <p className="truncate">{record.job_title || "N/A"}</p>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-mono text-xs">{record.soc_code || "N/A"}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                            {record.soc_title}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {record.worksite_city}, {record.worksite_state}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {formatCurrency(record.wage_rate_from, record.wage_unit)}
                            {record.wage_rate_to && record.wage_rate_to !== record.wage_rate_from && (
                              <> - {formatCurrency(record.wage_rate_to, record.wage_unit)}</>
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(record.prevailing_wage, record.wage_unit)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{record.pw_wage_level || "N/A"}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.decision_date 
                          ? new Date(record.decision_date).toLocaleDateString()
                          : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {!searchQuery && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Enter an employer name to search LCA history</p>
            <p className="text-sm mt-1">Example: "Sai Business Solutions LLC"</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
