'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface ContributorApplicationsFilterValues {
  search: string;
  country: string;
  profession: string;
  organization: string;
  expertise: string;
}

interface ContributorApplicationsFiltersProps {
  values: ContributorApplicationsFilterValues;
  onChange: (key: keyof ContributorApplicationsFilterValues, value: string) => void;
}

const TEXT_FILTERS: { key: keyof ContributorApplicationsFilterValues; label: string; placeholder: string }[] = [
  { key: 'country', label: 'Country', placeholder: 'e.g. Bangladesh' },
  { key: 'profession', label: 'Profession', placeholder: 'e.g. Data Scientist' },
  { key: 'organization', label: 'Organization', placeholder: 'e.g. BUET' },
  { key: 'expertise', label: 'Expertise', placeholder: 'e.g. Bangla NLP' },
];

// No controlled vocabulary exists for country/profession/organization/expertise
// (applicants free-type them on the form), so these are text filters matched
// case-insensitively server-side — not FilterSelect dropdowns.
export function ContributorApplicationsFilters({
  values,
  onChange,
}: ContributorApplicationsFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Label htmlFor="contributor-applications-search" className="sr-only">
          Search by name, expertise, or applicant
        </Label>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id="contributor-applications-search"
          value={values.search}
          onChange={(event) => onChange('search', event.target.value)}
          placeholder="Search by name, expertise, or applicant…"
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TEXT_FILTERS.map(({ key, label, placeholder }) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={`contributor-applications-${key}`}>{label}</Label>
            <Input
              id={`contributor-applications-${key}`}
              value={values[key]}
              onChange={(event) => onChange(key, event.target.value)}
              placeholder={placeholder}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
