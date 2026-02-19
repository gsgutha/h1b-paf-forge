import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { DollarSign, Info, MapPin, Building2, Search, CheckCircle2, Loader2 } from 'lucide-react';
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { WageInfo, WorksiteLocation, JobDetails } from '@/types/paf';
import { supabase } from '@/integrations/supabase/client';

const secondaryWageSchema = z.object({
  prevailingWage: z.number().min(0.01, 'Prevailing wage is required'),
  prevailingWageUnit: z.enum(['Hour', 'Week', 'Bi-Weekly', 'Month', 'Year']),
  wageLevel: z.enum(['Level I', 'Level II', 'Level III', 'Level IV']),
  wageSource: z.string().min(1, 'Wage source is required'),
  wageSourceDate: z.string().min(1, 'Source date is required'),
  areaCode: z.string().optional(),
  areaName: z.string().optional(),
});

// Base schema for primary wage fields
const wageSchema = z.object({
  prevailingWage: z.number().min(0.01, 'Prevailing wage is required'),
  prevailingWageUnit: z.enum(['Hour', 'Week', 'Bi-Weekly', 'Month', 'Year']),
  wageLevel: z.enum(['Level I', 'Level II', 'Level III', 'Level IV']),
  wageSource: z.string().min(1, 'Wage source is required'),
  wageSourceDate: z.string().min(1, 'Source date is required'),
  actualWage: z.number().min(0.01, 'Actual wage is required'),
  actualWageUnit: z.enum(['Hour', 'Week', 'Bi-Weekly', 'Month', 'Year']),
  hasSecondaryWage: z.boolean().optional(),
  secondaryWage: z.object({
    prevailingWage: z.number().optional(),
    prevailingWageUnit: z.enum(['Hour', 'Week', 'Bi-Weekly', 'Month', 'Year']).optional(),
    wageLevel: z.enum(['Level I', 'Level II', 'Level III', 'Level IV']).optional(),
    wageSource: z.string().optional(),
    wageSourceDate: z.string().optional(),
    areaCode: z.string().optional(),
    areaName: z.string().optional(),
  }).optional(),
}).superRefine((data, ctx) => {
  if (data.hasSecondaryWage) {
    if (!data.secondaryWage?.prevailingWage || data.secondaryWage.prevailingWage < 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Secondary prevailing wage is required',
        path: ['secondaryWage', 'prevailingWage'],
      });
    }
    if (!data.secondaryWage?.wageSource) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Secondary wage source is required',
        path: ['secondaryWage', 'wageSource'],
      });
    }
    if (!data.secondaryWage?.wageSourceDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Secondary source date is required',
        path: ['secondaryWage', 'wageSourceDate'],
      });
    }
  }
});

const wageLevelDescriptions = {
  'Level I': 'Entry level - 17th percentile wage',
  'Level II': 'Qualified - 34th percentile wage',
  'Level III': 'Experienced - 50th percentile wage',
  'Level IV': 'Fully competent - 67th percentile wage',
};

const WAGE_YEARS = [
  '2025-2026',
  '2024-2025',
  '2023-2024',
  '2022-2023',
  '2021-2022',
  '2020-2021',
  '2019-2020',
];

interface WageRecord {
  area_code: string;
  area_name: string;
  soc_code: string;
  soc_title: string;
  level_1_hourly: number | null;
  level_1_annual: number | null;
  level_2_hourly: number | null;
  level_2_annual: number | null;
  level_3_hourly: number | null;
  level_3_annual: number | null;
  level_4_hourly: number | null;
  level_4_annual: number | null;
  mean_hourly: number | null;
  mean_annual: number | null;
}

interface WageLevelRow {
  level: 'Level I' | 'Level II' | 'Level III' | 'Level IV';
  hourly: number | null;
  annual: number | null;
}

function getWageLevelRows(record: WageRecord): WageLevelRow[] {
  return [
    { level: 'Level I', hourly: record.level_1_hourly, annual: record.level_1_annual },
    { level: 'Level II', hourly: record.level_2_hourly, annual: record.level_2_annual },
    { level: 'Level III', hourly: record.level_3_hourly, annual: record.level_3_annual },
    { level: 'Level IV', hourly: record.level_4_hourly, annual: record.level_4_annual },
  ];
}

interface PrevailingWageLookupProps {
  socCode?: string;
  areaCode?: string;
  areaName?: string;
  onSelect: (params: {
    wageLevel: 'Level I' | 'Level II' | 'Level III' | 'Level IV';
    prevailingWage: number;
    prevailingWageUnit: 'Hour' | 'Week' | 'Bi-Weekly' | 'Month' | 'Year';
    wageYear: string;
  }) => void;
  label?: string;
}

function PrevailingWageLookup({ socCode, areaCode, areaName, onSelect, label = 'Primary' }: PrevailingWageLookupProps) {
  const [wageYear, setWageYear] = useState<string>('2024-2025');
  const [loading, setLoading] = useState(false);
  const [wageRecord, setWageRecord] = useState<WageRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  const canLookup = !!socCode && !!areaCode;

  const handleLookup = async () => {
    if (!canLookup) return;
    setLoading(true);
    setError(null);
    setWageRecord(null);
    setSelectedLevel(null);

    // Normalize SOC code: strip trailing .00 or similar suffixes
    const normalizedSoc = socCode.replace(/\..*$/, '');

    const { data, error: dbError } = await supabase
      .from('oflc_prevailing_wages')
      .select('*')
      .eq('wage_year', wageYear)
      .eq('area_code', areaCode)
      .ilike('soc_code', `${normalizedSoc}%`)
      .limit(1)
      .maybeSingle();

    setLoading(false);

    if (dbError) {
      setError('Database error: ' + dbError.message);
      return;
    }

    if (!data) {
      setError(`No wage data found for SOC ${normalizedSoc} in area ${areaCode} for ${wageYear}. Please enter manually.`);
      return;
    }

    setWageRecord(data as WageRecord);
  };

  // Auto-lookup when area code or soc code changes
  useEffect(() => {
    if (canLookup) {
      handleLookup();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socCode, areaCode, wageYear]);

  const handleSelectLevel = (row: WageLevelRow) => {
    if (!row.annual) return;
    setSelectedLevel(row.level);
    onSelect({
      wageLevel: row.level,
      prevailingWage: row.annual,
      prevailingWageUnit: 'Year',
      wageYear,
    });
  };

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">
          OFLC Prevailing Wage Lookup — {label}
        </span>
        {!canLookup && (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Area code required from Worksite step
          </Badge>
        )}
      </div>

      {canLookup && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">SOC Code</Label>
              <div className="text-sm font-mono font-medium text-foreground">{socCode}</div>
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Area Code</Label>
              <div className="text-sm font-mono font-medium text-foreground">{areaCode}</div>
            </div>
            {areaName && (
              <div className="flex-2">
                <Label className="text-xs text-muted-foreground">Area</Label>
                <div className="text-sm font-medium text-foreground truncate max-w-[200px]">{areaName}</div>
              </div>
            )}
            <div className="w-40">
              <Label className="text-xs text-muted-foreground">Wage Year</Label>
              <Select value={wageYear} onValueChange={setWageYear}>
                <SelectTrigger className="h-8 text-xs mt-0.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WAGE_YEARS.map(y => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Looking up prevailing wages...
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded p-2">{error}</div>
          )}

          {wageRecord && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground mb-2">
                Click a row to auto-fill the prevailing wage fields below:
              </p>
              <div className="rounded border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted text-muted-foreground text-xs">
                      <th className="text-left px-3 py-2">Level</th>
                      <th className="text-right px-3 py-2">Hourly</th>
                      <th className="text-right px-3 py-2">Annual</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {getWageLevelRows(wageRecord).map((row) => {
                      const isSelected = selectedLevel === row.level;
                      return (
                        <tr
                          key={row.level}
                          className={`border-t border-border cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-primary/10 text-primary'
                              : 'hover:bg-accent/5'
                          }`}
                          onClick={() => handleSelectLevel(row)}
                        >
                          <td className="px-3 py-2 font-medium">{row.level}</td>
                          <td className="px-3 py-2 text-right font-mono">
                            {row.hourly != null ? `$${row.hourly.toFixed(2)}/hr` : '—'}
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            {row.annual != null ? `$${row.annual.toLocaleString()}/yr` : '—'}
                          </td>
                          <td className="px-3 py-2 text-center w-10">
                            {isSelected && <CheckCircle2 className="h-4 w-4 text-primary inline" />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                Source: FLAG.gov OFLC OES — {wageYear}
                {wageRecord.area_name ? ` · ${wageRecord.area_name}` : ''}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface WageInfoStepProps {
  data: Partial<WageInfo>;
  worksite?: WorksiteLocation;
  job?: Partial<JobDetails>;
  onNext: (data: WageInfo) => void;
  onBack: () => void;
}

export function WageInfoStep({ data, worksite, job, onNext, onBack }: WageInfoStepProps) {
  const hasSecondaryWorksite = worksite?.hasSecondaryWorksite && worksite?.secondaryWorksite;
  const primaryCounty = worksite?.county || '';
  const secondaryCounty = worksite?.secondaryWorksite?.county || '';
  const isDifferentCounty = hasSecondaryWorksite && primaryCounty !== secondaryCounty;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    control,
  } = useForm<WageInfo>({
    resolver: zodResolver(wageSchema),
    defaultValues: {
      prevailingWage: data.prevailingWage || 0,
      prevailingWageUnit: data.prevailingWageUnit || 'Year',
      actualWage: data.actualWage || 0,
      actualWageUnit: data.actualWageUnit || 'Year',
      wageLevel: data.wageLevel || 'Level I',
      wageSource: data.wageSource || 'OES',
      wageSourceDate: data.wageSourceDate || '',
      hasSecondaryWage: data.hasSecondaryWage ?? isDifferentCounty,
      secondaryWage: data.secondaryWage || {
        prevailingWage: 0,
        prevailingWageUnit: 'Year',
        wageLevel: 'Level I',
        wageSource: 'OES',
        wageSourceDate: '',
        areaCode: '',
        areaName: secondaryCounty ? `${worksite?.secondaryWorksite?.city}, ${worksite?.secondaryWorksite?.state}` : '',
      },
    },
  });

  const onSubmit = (formData: WageInfo) => {
    if (!formData.hasSecondaryWage) {
      formData.secondaryWage = undefined;
    }
    onNext(formData);
  };

  const prevailingWage = watch('prevailingWage');
  const actualWage = watch('actualWage');
  const hasSecondaryWage = watch('hasSecondaryWage');
  const secondaryPrevailingWage = watch('secondaryWage.prevailingWage');
  const prevailingWageUnit = watch('prevailingWageUnit');
  const actualWageUnit = watch('actualWageUnit');
  
  const maxPrevailingWage = hasSecondaryWage && secondaryPrevailingWage 
    ? Math.max(prevailingWage || 0, secondaryPrevailingWage) 
    : prevailingWage;
  const isWageCompliant = actualWage >= maxPrevailingWage;
  const hasNonYearUnit = prevailingWageUnit !== 'Year' || actualWageUnit !== 'Year';
  const canProceed = isWageCompliant || actualWage === 0 || prevailingWage === 0;

  // Lookup handlers
  const handlePrimaryLookupSelect = ({ wageLevel, prevailingWage, prevailingWageUnit, wageYear }: {
    wageLevel: 'Level I' | 'Level II' | 'Level III' | 'Level IV';
    prevailingWage: number;
    prevailingWageUnit: 'Hour' | 'Week' | 'Bi-Weekly' | 'Month' | 'Year';
    wageYear: string;
  }) => {
    setValue('wageLevel', wageLevel);
    setValue('prevailingWage', prevailingWage);
    setValue('prevailingWageUnit', prevailingWageUnit);
    setValue('wageSource', 'OES');
    // Set source date to July 1 of the first year in the range (e.g., 2024-2025 → 2024-07-01)
    const startYear = wageYear.split('-')[0];
    setValue('wageSourceDate', `${startYear}-07-01`);
  };

  const handleSecondaryLookupSelect = ({ wageLevel, prevailingWage, prevailingWageUnit, wageYear }: {
    wageLevel: 'Level I' | 'Level II' | 'Level III' | 'Level IV';
    prevailingWage: number;
    prevailingWageUnit: 'Hour' | 'Week' | 'Bi-Weekly' | 'Month' | 'Year';
    wageYear: string;
  }) => {
    setValue('secondaryWage.wageLevel', wageLevel);
    setValue('secondaryWage.prevailingWage', prevailingWage);
    setValue('secondaryWage.prevailingWageUnit', prevailingWageUnit);
    setValue('secondaryWage.wageSource', 'OES');
    const startYear = wageYear.split('-')[0];
    setValue('secondaryWage.wageSourceDate', `${startYear}-07-01`);
  };

  return (
    <div className="fade-in">
      <div className="paf-section-header">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
          <DollarSign className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Wage Information</h2>
          <p className="text-sm text-muted-foreground">Prevailing wage and actual wage details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-lg bg-muted/50 p-4 border border-border">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-accent mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Prevailing Wage Requirement</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The actual wage paid to the H-1B worker must be at least equal to the prevailing wage
                for the occupation in the area of intended employment.
              </p>
            </div>
          </div>
        </div>

        {/* Primary Worksite Prevailing Wage */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Primary Worksite Prevailing Wage</CardTitle>
            </div>
            {worksite && (
              <CardDescription>
                {worksite.worksiteName && `${worksite.worksiteName}, `}
                {worksite.city}, {worksite.state}
                {worksite.county && ` (${worksite.county} County)`}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Lookup Panel */}
            <PrevailingWageLookup
              socCode={job?.socCode}
              areaCode={worksite?.areaCode}
              areaName={worksite?.areaName}
              onSelect={handlePrimaryLookupSelect}
              label="Primary Worksite"
            />

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label htmlFor="prevailingWage">Prevailing Wage Rate *</Label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="prevailingWage"
                    type="number"
                    step="0.01"
                    {...register('prevailingWage', { valueAsNumber: true })}
                    className="pl-7"
                    placeholder="0.00"
                  />
                </div>
                {errors.prevailingWage && (
                  <p className="mt-1 text-sm text-destructive">{errors.prevailingWage.message}</p>
                )}
              </div>

              <div>
                <Label>Wage Unit *</Label>
                <Controller
                  name="prevailingWageUnit"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
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
                  )}
                />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <Label>Wage Level *</Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <div className="space-y-2">
                        {Object.entries(wageLevelDescriptions).map(([level, desc]) => (
                          <div key={level}>
                            <span className="font-medium">{level}:</span> {desc}
                          </div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Controller
                  name="wageLevel"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Level I">Level I (Entry)</SelectItem>
                        <SelectItem value="Level II">Level II (Qualified)</SelectItem>
                        <SelectItem value="Level III">Level III (Experienced)</SelectItem>
                        <SelectItem value="Level IV">Level IV (Fully Competent)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div>
                <Label htmlFor="wageSource">Wage Source *</Label>
                <Controller
                  name="wageSource"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OES">OES (OEWS)</SelectItem>
                        <SelectItem value="CBA">Collective Bargaining Agreement</SelectItem>
                        <SelectItem value="DBA">Davis-Bacon Act</SelectItem>
                        <SelectItem value="SCA">Service Contract Act</SelectItem>
                        <SelectItem value="Other">Other Survey</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.wageSource && (
                  <p className="mt-1 text-sm text-destructive">{errors.wageSource.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="wageSourceDate">Wage Source Date *</Label>
                <Input
                  id="wageSourceDate"
                  type="date"
                  {...register('wageSourceDate')}
                  className="mt-1.5"
                />
                {errors.wageSourceDate && (
                  <p className="mt-1 text-sm text-destructive">{errors.wageSourceDate.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Secondary Worksite Prevailing Wage */}
        {hasSecondaryWorksite && (
          <Card className={hasSecondaryWage ? 'border-primary/50' : ''}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-secondary" />
                  <CardTitle className="text-lg">Secondary Worksite Prevailing Wage</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="hasSecondaryWage" className="text-sm">
                    Different Wage Area
                  </Label>
                  <Switch
                    id="hasSecondaryWage"
                    checked={hasSecondaryWage}
                    onCheckedChange={(checked) => setValue('hasSecondaryWage', checked)}
                  />
                </div>
              </div>
              <CardDescription>
                {worksite?.secondaryWorksite?.worksiteName && `${worksite.secondaryWorksite.worksiteName}, `}
                {worksite?.secondaryWorksite?.city}, {worksite?.secondaryWorksite?.state}
                {worksite?.secondaryWorksite?.county && ` (${worksite.secondaryWorksite.county} County)`}
              </CardDescription>
              {isDifferentCounty && (
                <div className="mt-2 p-2 bg-warning/10 rounded text-xs text-warning-foreground">
                  <strong>Note:</strong> Secondary worksite is in a different county ({secondaryCounty} vs {primaryCounty}). 
                  Enable this to specify a separate prevailing wage for compliance.
                </div>
              )}
            </CardHeader>
            
            {hasSecondaryWage && (
              <CardContent className="space-y-5">
                {/* Secondary Lookup Panel */}
                <PrevailingWageLookup
                  socCode={job?.socCode}
                  areaCode={worksite?.secondaryWorksite ? (worksite as any).secondaryAreaCode : undefined}
                  areaName={worksite?.secondaryWorksite?.county ? `${worksite.secondaryWorksite.city}, ${worksite.secondaryWorksite.state}` : undefined}
                  onSelect={handleSecondaryLookupSelect}
                  label="Secondary Worksite"
                />

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <Label htmlFor="secondaryPrevailingWage">Prevailing Wage Rate *</Label>
                    <div className="relative mt-1.5">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="secondaryPrevailingWage"
                        type="number"
                        step="0.01"
                        {...register('secondaryWage.prevailingWage', { valueAsNumber: true })}
                        className="pl-7"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Wage Unit *</Label>
                    <Controller
                      name="secondaryWage.prevailingWageUnit"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
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
                      )}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <Label>Wage Level *</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <div className="space-y-2">
                            {Object.entries(wageLevelDescriptions).map(([level, desc]) => (
                              <div key={level}>
                                <span className="font-medium">{level}:</span> {desc}
                              </div>
                            ))}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Controller
                      name="secondaryWage.wageLevel"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="mt-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Level I">Level I (Entry)</SelectItem>
                            <SelectItem value="Level II">Level II (Qualified)</SelectItem>
                            <SelectItem value="Level III">Level III (Experienced)</SelectItem>
                            <SelectItem value="Level IV">Level IV (Fully Competent)</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div>
                    <Label>Wage Source *</Label>
                    <Controller
                      name="secondaryWage.wageSource"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="mt-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OES">OES (OEWS)</SelectItem>
                            <SelectItem value="CBA">Collective Bargaining Agreement</SelectItem>
                            <SelectItem value="DBA">Davis-Bacon Act</SelectItem>
                            <SelectItem value="SCA">Service Contract Act</SelectItem>
                            <SelectItem value="Other">Other Survey</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div>
                    <Label htmlFor="secondaryWageSourceDate">Wage Source Date *</Label>
                    <Input
                      id="secondaryWageSourceDate"
                      type="date"
                      {...register('secondaryWage.wageSourceDate')}
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="secondaryAreaName">Wage Area Name</Label>
                    <Input
                      id="secondaryAreaName"
                      {...register('secondaryWage.areaName')}
                      placeholder="e.g., New York-Newark-Jersey City, NY-NJ-PA"
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Actual Wage Section */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Actual Wage</CardTitle>
            <CardDescription>
              The wage you will pay the H-1B worker (must be the higher of actual or prevailing wage)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label htmlFor="actualWage">Actual Wage Rate *</Label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="actualWage"
                    type="number"
                    step="0.01"
                    {...register('actualWage', { valueAsNumber: true })}
                    className="pl-7"
                    placeholder="0.00"
                  />
                </div>
                {errors.actualWage && (
                  <p className="mt-1 text-sm text-destructive">{errors.actualWage.message}</p>
                )}
              </div>

              <div>
                <Label>Wage Unit *</Label>
                <Controller
                  name="actualWageUnit"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
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
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Unit Consistency Warning (Rule 4) */}
        {hasNonYearUnit && (
          <div className="rounded-lg p-4 border bg-warning/10 border-warning/20">
            <p className="text-sm font-medium text-warning-foreground flex items-center gap-2">
              ⚠️ Wage Unit Recommendation
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              DOL typically expects annual wages. Consider converting to yearly rates for consistency across all PAF documents.
            </p>
          </div>
        )}

        {/* Wage Compliance Check */}
        {prevailingWage > 0 && actualWage > 0 && (
          <div className={`rounded-lg p-4 border ${
            isWageCompliant 
              ? 'bg-success/10 border-success/20 text-success' 
              : 'bg-destructive/10 border-destructive/20 text-destructive'
          }`}>
            <p className="text-sm font-medium">
              {isWageCompliant 
                ? `✓ Wage is compliant - actual wage ($${actualWage.toLocaleString()}) meets or exceeds ${hasSecondaryWage ? 'highest ' : ''}prevailing wage ($${maxPrevailingWage.toLocaleString()})`
                : `🔴 PAF BLOCKED: Actual wage ($${actualWage.toLocaleString()}) is below the ${hasSecondaryWage ? 'highest ' : ''}prevailing wage requirement ($${maxPrevailingWage.toLocaleString()})`
              }
            </p>
            {!isWageCompliant && (
              <p className="text-xs mt-1">
                You must increase the actual wage to at least ${maxPrevailingWage.toLocaleString()} to proceed with PAF generation.
              </p>
            )}
            {hasSecondaryWage && secondaryPrevailingWage > 0 && (
              <p className="text-xs mt-1 opacity-80">
                Primary: ${prevailingWage?.toLocaleString() || 0} | Secondary: ${secondaryPrevailingWage.toLocaleString()}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button type="button" variant="wizardOutline" size="lg" onClick={onBack}>
            Back
          </Button>
          <Button 
            type="submit" 
            variant="wizard" 
            size="lg"
            disabled={!canProceed}
            title={!canProceed ? 'Offered wage does not meet prevailing wage' : undefined}
          >
            Next: Documents
          </Button>
        </div>
      </form>
    </div>
  );
}
