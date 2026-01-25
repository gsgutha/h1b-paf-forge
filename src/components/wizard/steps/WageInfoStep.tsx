import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DollarSign, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import type { WageInfo } from '@/types/paf';

const wageSchema = z.object({
  prevailingWage: z.number().min(0.01, 'Prevailing wage is required'),
  prevailingWageUnit: z.enum(['Hour', 'Week', 'Bi-Weekly', 'Month', 'Year']),
  wageLevel: z.enum(['Level I', 'Level II', 'Level III', 'Level IV']),
  wageSource: z.string().min(1, 'Wage source is required'),
  wageSourceDate: z.string().min(1, 'Source date is required'),
  actualWage: z.number().min(0.01, 'Actual wage is required'),
  actualWageUnit: z.enum(['Hour', 'Week', 'Bi-Weekly', 'Month', 'Year']),
});

const wageLevelDescriptions = {
  'Level I': 'Entry level - 17th percentile wage',
  'Level II': 'Qualified - 34th percentile wage',
  'Level III': 'Experienced - 50th percentile wage',
  'Level IV': 'Fully competent - 67th percentile wage',
};

interface WageInfoStepProps {
  data: Partial<WageInfo>;
  onNext: (data: WageInfo) => void;
  onBack: () => void;
}

export function WageInfoStep({ data, onNext, onBack }: WageInfoStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<WageInfo>({
    resolver: zodResolver(wageSchema),
    defaultValues: {
      ...data,
      prevailingWageUnit: data.prevailingWageUnit || 'Year',
      actualWageUnit: data.actualWageUnit || 'Year',
      wageLevel: data.wageLevel || 'Level I',
      wageSource: data.wageSource || 'OES',
    },
  });

  const onSubmit = (formData: WageInfo) => {
    onNext(formData);
  };

  const prevailingWage = watch('prevailingWage');
  const actualWage = watch('actualWage');
  const isWageCompliant = actualWage >= prevailingWage;

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

        <div className="grid gap-6 md:grid-cols-2">
          <div className="md:col-span-2 border-b border-border pb-4">
            <h3 className="text-lg font-medium text-foreground mb-4">Prevailing Wage</h3>
          </div>

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
            <Select
              value={watch('prevailingWageUnit')}
              onValueChange={(value: WageInfo['prevailingWageUnit']) => 
                setValue('prevailingWageUnit', value)
              }
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
            <Select
              value={watch('wageLevel')}
              onValueChange={(value: WageInfo['wageLevel']) => setValue('wageLevel', value)}
            >
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
          </div>

          <div>
            <Label htmlFor="wageSource">Wage Source *</Label>
            <Select
              value={watch('wageSource')}
              onValueChange={(value) => setValue('wageSource', value)}
            >
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

          <div className="md:col-span-2 border-b border-border pb-4 mt-4">
            <h3 className="text-lg font-medium text-foreground mb-4">Actual Wage</h3>
          </div>

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
            <Select
              value={watch('actualWageUnit')}
              onValueChange={(value: WageInfo['actualWageUnit']) => 
                setValue('actualWageUnit', value)
              }
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

        {prevailingWage > 0 && actualWage > 0 && (
          <div className={`rounded-lg p-4 border ${
            isWageCompliant 
              ? 'bg-success/10 border-success/20 text-success' 
              : 'bg-destructive/10 border-destructive/20 text-destructive'
          }`}>
            <p className="text-sm font-medium">
              {isWageCompliant 
                ? '✓ Wage is compliant - actual wage meets or exceeds prevailing wage'
                : '✗ Warning: Actual wage is below the prevailing wage requirement'
              }
            </p>
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button type="button" variant="wizardOutline" size="lg" onClick={onBack}>
            Back
          </Button>
          <Button type="submit" variant="wizard" size="lg">
            Review & Generate PAF
          </Button>
        </div>
      </form>
    </div>
  );
}
