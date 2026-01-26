import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, Loader2, Plus, X } from 'lucide-react';
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
import { loadGeography, getUniqueStates, getAreasForState } from '@/lib/dataLoader';
import type { WorksiteLocation, GeographyArea } from '@/types/paf';

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming'
];

const secondaryWorksiteSchema = z.object({
  worksiteName: z.string().optional(),
  address1: z.string().min(1, 'Address is required'),
  address2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(5, 'Valid postal code required'),
  county: z.string().optional(),
});

const worksiteSchema = z.object({
  worksiteName: z.string().optional(),
  address1: z.string().min(1, 'Address is required'),
  address2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(5, 'Valid postal code required'),
  county: z.string().optional(),
  areaCode: z.string().optional(),
  areaName: z.string().optional(),
  hasSecondaryWorksite: z.boolean().optional(),
  secondaryWorksite: secondaryWorksiteSchema.optional(),
});

interface WorksiteStepProps {
  data: Partial<WorksiteLocation>;
  onNext: (data: WorksiteLocation) => void;
  onBack: () => void;
}

export function WorksiteStep({ data, onNext, onBack }: WorksiteStepProps) {
  const [geography, setGeography] = useState<GeographyArea[]>([]);
  const [stateAreas, setStateAreas] = useState<GeographyArea[]>([]);
  const [secondaryStateAreas, setSecondaryStateAreas] = useState<GeographyArea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSecondary, setShowSecondary] = useState(data.hasSecondaryWorksite || false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<WorksiteLocation>({
    resolver: zodResolver(worksiteSchema),
    defaultValues: {
      ...data,
      hasSecondaryWorksite: data.hasSecondaryWorksite || false,
      secondaryWorksite: data.secondaryWorksite || undefined,
    },
  });

  const selectedState = watch('state');
  const selectedCounty = watch('county');
  const secondaryState = watch('secondaryWorksite.state');
  const secondaryCounty = watch('secondaryWorksite.county');

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const geo = await loadGeography();
        setGeography(geo);
      } catch (error) {
        console.error('Error loading geography data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (selectedState && geography.length > 0) {
      const areas = getAreasForState(geography, selectedState);
      setStateAreas(areas);
    } else {
      setStateAreas([]);
    }
  }, [selectedState, geography]);

  useEffect(() => {
    if (secondaryState && geography.length > 0) {
      const areas = getAreasForState(geography, secondaryState);
      setSecondaryStateAreas(areas);
    } else {
      setSecondaryStateAreas([]);
    }
  }, [secondaryState, geography]);

  const handleCountySelect = (countyName: string) => {
    setValue('county', countyName);
    
    // Find the matching area
    const area = stateAreas.find(a => a.countyName === countyName);
    if (area) {
      setValue('areaCode', area.areaCode);
      setValue('areaName', area.areaName);
    }
  };

  const handleSecondaryCountySelect = (countyName: string) => {
    setValue('secondaryWorksite.county', countyName);
  };

  const uniqueCounties = [...new Set(stateAreas.map(a => a.countyName))].sort();
  const secondaryUniqueCounties = [...new Set(secondaryStateAreas.map(a => a.countyName))].sort();

  const handleSecondaryToggle = (enabled: boolean) => {
    setShowSecondary(enabled);
    setValue('hasSecondaryWorksite', enabled);
    if (!enabled) {
      setValue('secondaryWorksite', undefined);
    }
  };

  const onSubmit = (formData: WorksiteLocation) => {
    onNext(formData);
  };

  return (
    <div className="fade-in">
      <div className="paf-section-header">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
          <MapPin className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Worksite Location</h2>
          <p className="text-sm text-muted-foreground">Where will the employee work?</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <span className="ml-3 text-muted-foreground">Loading geography data...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="worksiteName">Worksite Name (Company/Client Name)</Label>
              <Input
                id="worksiteName"
                {...register('worksiteName')}
                className="mt-1.5"
                placeholder="e.g., ABC Corporation Headquarters"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Name of the worksite location (optional)
              </p>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="address1">Address Line 1 *</Label>
              <Input
                id="address1"
                {...register('address1')}
                className="mt-1.5"
                placeholder="Street address"
              />
              {errors.address1 && (
                <p className="mt-1 text-sm text-destructive">{errors.address1.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="address2">Address Line 2</Label>
              <Input
                id="address2"
                {...register('address2')}
                className="mt-1.5"
                placeholder="Suite, floor, building, etc."
              />
            </div>

            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                {...register('city')}
                className="mt-1.5"
                placeholder="City"
              />
              {errors.city && (
                <p className="mt-1 text-sm text-destructive">{errors.city.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="state">State *</Label>
              <Select
                value={watch('state')}
                onValueChange={(value) => {
                  setValue('state', value);
                  setValue('county', '');
                  setValue('areaCode', '');
                  setValue('areaName', '');
                }}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.state && (
                <p className="mt-1 text-sm text-destructive">{errors.state.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="postalCode">Postal Code *</Label>
              <Input
                id="postalCode"
                {...register('postalCode')}
                className="mt-1.5"
                placeholder="12345"
              />
              {errors.postalCode && (
                <p className="mt-1 text-sm text-destructive">{errors.postalCode.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="county">County</Label>
              <Select
                value={selectedCounty}
                onValueChange={handleCountySelect}
                disabled={!selectedState}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder={selectedState ? "Select county" : "Select state first"} />
                </SelectTrigger>
                <SelectContent>
                  {uniqueCounties.map((county) => (
                    <SelectItem key={county} value={county}>
                      {county}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {watch('areaName') && (
            <div className="rounded-lg bg-accent/5 p-4 border border-accent/20">
              <p className="text-sm font-medium text-foreground">Wage Area</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {watch('areaName')} (Code: {watch('areaCode')})
              </p>
            </div>
          )}

          {/* Secondary Worksite Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-muted/30">
            <div className="space-y-0.5">
              <Label htmlFor="secondary-toggle" className="text-base font-medium">
                Secondary Work Location
              </Label>
              <p className="text-sm text-muted-foreground">
                Add an additional worksite if the employee will work at multiple locations
              </p>
            </div>
            <Switch
              id="secondary-toggle"
              checked={showSecondary}
              onCheckedChange={handleSecondaryToggle}
            />
          </div>

          {/* Secondary Worksite Fields */}
          {showSecondary && (
            <div className="space-y-6 rounded-lg border border-accent/30 p-6 bg-accent/5">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-accent" />
                <h3 className="text-lg font-medium text-foreground">Secondary Worksite</h3>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label htmlFor="secondary-worksiteName">Worksite Name (Company/Client Name)</Label>
                  <Input
                    id="secondary-worksiteName"
                    {...register('secondaryWorksite.worksiteName')}
                    className="mt-1.5"
                    placeholder="e.g., Client Site, Branch Office"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Name of the secondary worksite location (optional)
                  </p>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="secondary-address1">Address Line 1 *</Label>
                  <Input
                    id="secondary-address1"
                    {...register('secondaryWorksite.address1')}
                    className="mt-1.5"
                    placeholder="Street address"
                  />
                  {errors.secondaryWorksite?.address1 && (
                    <p className="mt-1 text-sm text-destructive">{errors.secondaryWorksite.address1.message}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="secondary-address2">Address Line 2</Label>
                  <Input
                    id="secondary-address2"
                    {...register('secondaryWorksite.address2')}
                    className="mt-1.5"
                    placeholder="Suite, floor, building, etc."
                  />
                </div>

                <div>
                  <Label htmlFor="secondary-city">City *</Label>
                  <Input
                    id="secondary-city"
                    {...register('secondaryWorksite.city')}
                    className="mt-1.5"
                    placeholder="City"
                  />
                  {errors.secondaryWorksite?.city && (
                    <p className="mt-1 text-sm text-destructive">{errors.secondaryWorksite.city.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="secondary-state">State *</Label>
                  <Select
                    value={secondaryState || ''}
                    onValueChange={(value) => {
                      setValue('secondaryWorksite.state', value);
                      setValue('secondaryWorksite.county', '');
                    }}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.secondaryWorksite?.state && (
                    <p className="mt-1 text-sm text-destructive">{errors.secondaryWorksite.state.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="secondary-postalCode">Postal Code *</Label>
                  <Input
                    id="secondary-postalCode"
                    {...register('secondaryWorksite.postalCode')}
                    className="mt-1.5"
                    placeholder="12345"
                  />
                  {errors.secondaryWorksite?.postalCode && (
                    <p className="mt-1 text-sm text-destructive">{errors.secondaryWorksite.postalCode.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="secondary-county">County</Label>
                  <Select
                    value={secondaryCounty || ''}
                    onValueChange={handleSecondaryCountySelect}
                    disabled={!secondaryState}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder={secondaryState ? "Select county" : "Select state first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {secondaryUniqueCounties.map((county) => (
                        <SelectItem key={county} value={county}>
                          {county}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button type="button" variant="wizardOutline" size="lg" onClick={onBack}>
              Back
            </Button>
            <Button type="submit" variant="wizard" size="lg">
              Continue to Wage Info
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
