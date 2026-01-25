import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Briefcase, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { loadOccupations, searchOccupations, loadCrosswalk, getOnetCodesForSoc } from '@/lib/dataLoader';
import type { JobDetails } from '@/types/paf';
import type { OccupationCode, CrosswalkEntry } from '@/types/paf';

const jobSchema = z.object({
  jobTitle: z.string().min(1, 'Job title is required'),
  socCode: z.string().min(1, 'SOC code is required'),
  socTitle: z.string().min(1, 'SOC title is required'),
  onetCode: z.string().optional(),
  onetTitle: z.string().optional(),
  isFullTime: z.boolean().default(true),
  beginDate: z.string().min(1, 'Begin date is required'),
  endDate: z.string().min(1, 'End date is required'),
  wageRateFrom: z.number().min(1, 'Wage rate is required'),
  wageRateTo: z.number().optional(),
  wageUnit: z.enum(['Hour', 'Week', 'Bi-Weekly', 'Month', 'Year']),
  workersNeeded: z.number().min(1).default(1),
});

interface JobDetailsStepProps {
  data: Partial<JobDetails>;
  onNext: (data: JobDetails) => void;
  onBack: () => void;
}

export function JobDetailsStep({ data, onNext, onBack }: JobDetailsStepProps) {
  const [occupations, setOccupations] = useState<OccupationCode[]>([]);
  const [crosswalk, setCrosswalk] = useState<CrosswalkEntry[]>([]);
  const [onetOptions, setOnetOptions] = useState<CrosswalkEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<OccupationCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [socOpen, setSocOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<JobDetails>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      ...data,
      isFullTime: data.isFullTime ?? true,
      wageUnit: data.wageUnit || 'Year',
      workersNeeded: data.workersNeeded || 1,
    },
  });

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [occs, xwalk] = await Promise.all([
          loadOccupations(),
          loadCrosswalk(),
        ]);
        setOccupations(occs);
        setCrosswalk(xwalk);
      } catch (error) {
        console.error('Error loading occupation data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const results = searchOccupations(occupations, searchQuery);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, occupations]);

  const handleOccupationSelect = (occ: OccupationCode) => {
    setValue('socCode', occ.socCode);
    setValue('socTitle', occ.title);
    setSocOpen(false);
    
    // Load ONET codes for this SOC
    const onetCodes = getOnetCodesForSoc(crosswalk, occ.socCode);
    setOnetOptions(onetCodes);
    
    if (onetCodes.length === 1) {
      setValue('onetCode', onetCodes[0].onetCode);
      setValue('onetTitle', onetCodes[0].onetTitle);
    }
  };

  const onSubmit = (formData: JobDetails) => {
    onNext(formData);
  };

  const selectedSocCode = watch('socCode');
  const selectedOnetCode = watch('onetCode');

  return (
    <div className="fade-in">
      <div className="paf-section-header">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
          <Briefcase className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Job Details</h2>
          <p className="text-sm text-muted-foreground">Enter position and occupation information</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <span className="ml-3 text-muted-foreground">Loading occupation data...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="jobTitle">Job Title *</Label>
              <Input
                id="jobTitle"
                {...register('jobTitle')}
                className="mt-1.5"
                placeholder="e.g., Software Developer, Data Analyst"
              />
              {errors.jobTitle && (
                <p className="mt-1 text-sm text-destructive">{errors.jobTitle.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label>SOC (OES) Occupation Code *</Label>
              <Popover open={socOpen} onOpenChange={setSocOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="mt-1.5 w-full justify-between font-normal"
                  >
                    {selectedSocCode ? (
                      <span>{selectedSocCode} - {watch('socTitle')}</span>
                    ) : (
                      <span className="text-muted-foreground">Search for occupation code...</span>
                    )}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search by code, title, or description..."
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>No occupation found.</CommandEmpty>
                      <CommandGroup>
                        {searchResults.map((occ) => (
                          <CommandItem
                            key={occ.socCode}
                            value={occ.socCode}
                            onSelect={() => handleOccupationSelect(occ)}
                            className="flex flex-col items-start gap-1 py-3"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-semibold text-accent">
                                {occ.socCode}
                              </span>
                              <span className="font-medium">{occ.title}</span>
                            </div>
                            <span className="text-xs text-muted-foreground line-clamp-2">
                              {occ.description}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.socCode && (
                <p className="mt-1 text-sm text-destructive">{errors.socCode.message}</p>
              )}
            </div>

            {onetOptions.length > 0 && (
              <div className="md:col-span-2">
                <Label>O*NET Code (Optional - More Specific)</Label>
                <Select
                  value={selectedOnetCode}
                  onValueChange={(value) => {
                    const selected = onetOptions.find(o => o.onetCode === value);
                    if (selected) {
                      setValue('onetCode', selected.onetCode);
                      setValue('onetTitle', selected.onetTitle);
                    }
                  }}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select O*NET occupation" />
                  </SelectTrigger>
                  <SelectContent>
                    {onetOptions.map((onet) => (
                      <SelectItem key={onet.onetCode} value={onet.onetCode}>
                        {onet.onetCode} - {onet.onetTitle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isFullTime"
                  checked={watch('isFullTime')}
                  onCheckedChange={(checked) => setValue('isFullTime', checked)}
                />
                <Label htmlFor="isFullTime">Full-Time Position</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="workersNeeded">Workers Needed</Label>
              <Input
                id="workersNeeded"
                type="number"
                min={1}
                {...register('workersNeeded', { valueAsNumber: true })}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="beginDate">Begin Date *</Label>
              <Input
                id="beginDate"
                type="date"
                {...register('beginDate')}
                className="mt-1.5"
              />
              {errors.beginDate && (
                <p className="mt-1 text-sm text-destructive">{errors.beginDate.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                {...register('endDate')}
                className="mt-1.5"
              />
              {errors.endDate && (
                <p className="mt-1 text-sm text-destructive">{errors.endDate.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="wageRateFrom">Wage Rate From *</Label>
              <Input
                id="wageRateFrom"
                type="number"
                step="0.01"
                {...register('wageRateFrom', { valueAsNumber: true })}
                className="mt-1.5"
                placeholder="0.00"
              />
              {errors.wageRateFrom && (
                <p className="mt-1 text-sm text-destructive">{errors.wageRateFrom.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="wageRateTo">Wage Rate To (Optional)</Label>
              <Input
                id="wageRateTo"
                type="number"
                step="0.01"
                {...register('wageRateTo', { valueAsNumber: true })}
                className="mt-1.5"
                placeholder="0.00"
              />
            </div>

            <div>
              <Label>Wage Unit *</Label>
              <Select
                value={watch('wageUnit')}
                onValueChange={(value: JobDetails['wageUnit']) => setValue('wageUnit', value)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hour">Per Hour</SelectItem>
                  <SelectItem value="Week">Per Week</SelectItem>
                  <SelectItem value="Bi-Weekly">Bi-Weekly</SelectItem>
                  <SelectItem value="Month">Per Month</SelectItem>
                  <SelectItem value="Year">Per Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button type="button" variant="wizardOutline" size="lg" onClick={onBack}>
              Back
            </Button>
            <Button type="submit" variant="wizard" size="lg">
              Continue to Worksite
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
