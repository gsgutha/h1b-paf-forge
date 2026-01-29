import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, PenTool } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AUTHORIZED_SIGNATORIES, getSignatoryById } from '@/config/signatories';
import type { Employer } from '@/types/paf';

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

const employerSchema = z.object({
  legalBusinessName: z.string().min(1, 'Legal business name is required'),
  tradeName: z.string().optional(),
  address1: z.string().min(1, 'Address is required'),
  address2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(5, 'Valid postal code required'),
  country: z.string().default('United States Of America'),
  telephone: z.string().min(10, 'Valid phone number required'),
  fein: z.string().min(9, 'Valid FEIN required').max(11),
  naicsCode: z.string().min(4, 'Valid NAICS code required'),
  signatoryId: z.string().optional(),
  signingAuthorityName: z.string().optional(),
  signingAuthorityTitle: z.string().optional(),
  employeeName: z.string().optional(),
});

interface EmployerInfoStepProps {
  data: Partial<Employer>;
  onNext: (data: Employer) => void;
  onBack?: () => void;
}

export function EmployerInfoStep({ data, onNext, onBack }: EmployerInfoStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<Employer>({
    resolver: zodResolver(employerSchema),
    defaultValues: {
      ...data,
      country: data.country || 'United States Of America',
      signatoryId: data.signatoryId || AUTHORIZED_SIGNATORIES[0]?.id,
    },
  });

  const selectedSignatoryId = watch('signatoryId');
  const selectedSignatory = selectedSignatoryId ? getSignatoryById(selectedSignatoryId) : undefined;

  // When signatory is selected, auto-populate name and title
  const handleSignatoryChange = (signatoryId: string) => {
    setValue('signatoryId', signatoryId);
    const signatory = getSignatoryById(signatoryId);
    if (signatory) {
      setValue('signingAuthorityName', signatory.name);
      setValue('signingAuthorityTitle', signatory.title);
    }
  };

  const onSubmit = (formData: Employer) => {
    // Ensure signatory name/title are set from selection
    if (formData.signatoryId) {
      const signatory = getSignatoryById(formData.signatoryId);
      if (signatory) {
        formData.signingAuthorityName = signatory.name;
        formData.signingAuthorityTitle = signatory.title;
      }
    }
    onNext(formData);
  };

  return (
    <div className="fade-in">
      <div className="paf-section-header">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
          <Building2 className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Employer Information</h2>
          <p className="text-sm text-muted-foreground">Enter your company details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="legalBusinessName">Legal Business Name *</Label>
            <Input
              id="legalBusinessName"
              {...register('legalBusinessName')}
              className="mt-1.5"
              placeholder="Enter legal business name"
            />
            {errors.legalBusinessName && (
              <p className="mt-1 text-sm text-destructive">{errors.legalBusinessName.message}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="tradeName">Trade Name / DBA (if applicable)</Label>
            <Input
              id="tradeName"
              {...register('tradeName')}
              className="mt-1.5"
              placeholder="Doing Business As name"
            />
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
              placeholder="Suite, floor, etc."
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
              onValueChange={(value) => setValue('state', value)}
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
            <Label htmlFor="telephone">Telephone *</Label>
            <Input
              id="telephone"
              {...register('telephone')}
              className="mt-1.5"
              placeholder="+1 (555) 123-4567"
            />
            {errors.telephone && (
              <p className="mt-1 text-sm text-destructive">{errors.telephone.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="fein">FEIN (Federal EIN) *</Label>
            <Input
              id="fein"
              {...register('fein')}
              className="mt-1.5"
              placeholder="XX-XXXXXXX"
            />
            {errors.fein && (
              <p className="mt-1 text-sm text-destructive">{errors.fein.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="naicsCode">NAICS Code *</Label>
            <Input
              id="naicsCode"
              {...register('naicsCode')}
              className="mt-1.5"
              placeholder="541511"
            />
            {errors.naicsCode && (
              <p className="mt-1 text-sm text-destructive">{errors.naicsCode.message}</p>
            )}
          </div>
        </div>

        {/* Employee & Signing Authority Section */}
        <div className="border-t border-border pt-6 mt-6">
          <div className="flex items-center gap-2 mb-4">
            <PenTool className="h-5 w-5 text-accent" />
            <h3 className="text-lg font-medium text-foreground">Employee & Digital Signature</h3>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="employeeName">H-1B Worker Full Name</Label>
              <Input
                id="employeeName"
                {...register('employeeName')}
                className="mt-1.5"
                placeholder="e.g., John A. Smith"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                This name will appear on the Worker Receipt Acknowledgement
              </p>
            </div>

            {/* Authorized Signatory Selection */}
            <div className="md:col-span-2">
              <Label className="text-sm font-medium">Authorized Signatory *</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Select the authorized representative whose digital signature will appear on all PAF documents
              </p>
              
              <RadioGroup
                value={selectedSignatoryId}
                onValueChange={handleSignatoryChange}
                className="grid gap-3"
              >
                {AUTHORIZED_SIGNATORIES.map((signatory) => (
                  <div
                    key={signatory.id}
                    className={`flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                      selectedSignatoryId === signatory.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/50'
                    }`}
                    onClick={() => handleSignatoryChange(signatory.id)}
                  >
                    <RadioGroupItem value={signatory.id} id={signatory.id} />
                    <div className="flex-1">
                      <Label htmlFor={signatory.id} className="text-sm font-medium cursor-pointer">
                        {signatory.name}
                      </Label>
                      <p className="text-xs text-muted-foreground">{signatory.title}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-accent">
                      <PenTool className="h-3.5 w-3.5" />
                      <span>Digital Signature</span>
                    </div>
                  </div>
                ))}
              </RadioGroup>
              
              {selectedSignatory && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Selected:</span> {selectedSignatory.name} ({selectedSignatory.title}) 
                    will digitally sign all generated PAF documents.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          {onBack ? (
            <Button type="button" variant="outline" onClick={onBack}>
              Back to LCA Selection
            </Button>
          ) : (
            <div />
          )}
          <Button type="submit" variant="wizard" size="lg">
            Continue to Job Details
          </Button>
        </div>
      </form>
    </div>
  );
}
