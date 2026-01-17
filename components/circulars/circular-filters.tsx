'use client';

import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { SECONDARY_TOPICS } from '@/lib/constants/topics';

interface CircularFiltersProps {
  selectedTypes: string[];
  onTypesChange: (types: string[]) => void;
  selectedYear: string;
  onYearChange: (year: string) => void;
  selectedTopic: string;
  onTopicChange: (topic: string) => void;
  availableYears: string[];
}

export function CircularFilters({
  selectedTypes,
  onTypesChange,
  selectedYear,
  onYearChange,
  selectedTopic,
  onTopicChange,
  availableYears,
}: CircularFiltersProps) {
  const types = [
    { value: 'hrl', label: 'HRL Circular' },
    { value: 'hrops', label: 'HR OPS Circular' },
  ];

  const handleTypeToggle = (type: string) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter(t => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };

  const handleClearAll = () => {
    onTypesChange([]);
    onYearChange('all');
    onTopicChange('all');
  };

  const hasActiveFilters = selectedTypes.length > 0 || selectedYear !== 'all' || selectedTopic !== 'all';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Filters</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-auto p-0 text-xs"
          >
            <X className="mr-1 h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      {/* Type Filters */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Type</Label>
        <div className="space-y-2">
          {types.map((type) => (
            <div key={type.value} className="flex items-center space-x-2">
              <Checkbox
                id={type.value}
                checked={selectedTypes.includes(type.value)}
                onCheckedChange={() => handleTypeToggle(type.value)}
              />
              <label
                htmlFor={type.value}
                className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {type.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Topic Filter */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Topic</Label>
        <Select value={selectedTopic} onValueChange={onTopicChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Topics</SelectItem>
            {SECONDARY_TOPICS.map((topic) => (
              <SelectItem key={topic.value} value={topic.value}>
                {topic.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Year Filter */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Year</Label>
        <Select value={selectedYear} onValueChange={onYearChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {availableYears.map((year) => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
