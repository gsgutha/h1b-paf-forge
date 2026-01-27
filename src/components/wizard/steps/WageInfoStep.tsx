import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DollarSign, Info, MapPin, Building2 } from 'lucide-react';
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
import type { WageInfo, WorksiteLocation } from '@/types/paf';

const secondaryWageSchema = z.object({
  prevailingWage: z.number().min(0.01, 'Prevailing wage is required'),
  prevailingWageUnit: z.enum(['Hour', 'Week', 'Bi-Weekly', 'Month', 'Year']),
  wageLevel: z.enum(['Level I', 'Level II', 'Level III', 'Level IV']),
  wageSource: z.string().min(1, 'Wage source is required'),
  wageSourceDate: z.string().min(1, 'Source date is required'),
  areaCode: z.string().optional(),
  areaName: z.string().optional(),
});

const wageSchema = z.object({
  prevailingWage: z.number().min(0.01, 'Prevailing wage is required'),
  prevailingWageUnit: z.enum(['Hour', 'Week', 'Bi-Weekly', 'Month', 'Year']),
  wageLevel: z.enum(['Level I', 'Level II', 'Level III', 'Level IV']),
  wageSource: z.string().min(1, 'Wage source is required'),
  wageSourceDate: z.string().min(1, 'Source date is required'),
  actualWage: z.number().min(0.01, 'Actual wage is required'),
  actualWageUnit: z.enum(['Hour', 'Week', 'Bi-Weekly', 'Month', 'Year']),
  hasSecondaryWage: z.boolean().optional(),
  secondaryWage: secondaryWageSchema.optional(),
});

const wageLevelDescriptions = {
  'Level I': 'Entry level - 17th percentile wage',
  'Level II': 'Qualified - 34th percentile wage',
  'Level III': 'Experienced - 50th percentile wage',
  'Level IV': 'Fully competent - 67th percentile wage',
};

interface WageInfoStepProps {
  data: Partial<WageInfo>;
  worksite?: WorksiteLocation;
  onNext: (data: WageInfo) => void;
  onBack: () => void;
}

export function WageInfoStep({ data, worksite, onNext, onBack }: WageInfoStepProps) {
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
    onNext(formData);
  };

  const prevailingWage = watch('prevailingWage');
  const actualWage = watch('actualWage');
  const hasSecondaryWage = watch('hasSecondaryWage');
  const secondaryPrevailingWage = watch('secondaryWage.prevailingWage');
  
  // Check compliance: actual wage must be >= MAX of both prevailing wages
  const maxPrevailingWage = hasSecondaryWage && secondaryPrevailingWage 
    ? Math.max(prevailingWage || 0, secondaryPrevailingWage) 
    : prevailingWage;
  const isWageCompliant = actualWage >= maxPrevailingWage;

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
          <CardContent>
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
              <CardContent>
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
                : `✗ Warning: Actual wage ($${actualWage.toLocaleString()}) is below the ${hasSecondaryWage ? 'highest ' : ''}prevailing wage requirement ($${maxPrevailingWage.toLocaleString()})`
              }
            </p>
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
          <Button type="submit" variant="wizard" size="lg">
            Next: Documents
          </Button>
        </div>
      </form>
    </div>
  );
}
