'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface ResourceFiltersProps {
  selectedTopic: string;
  onTopicChange: (topic: string) => void;
  selectedCategoryType: string;
  onCategoryTypeChange: (type: string) => void;
  availableTopics: string[];
  availableCategoryTypes: string[];
}

export function ResourceFilters({
  selectedTopic,
  onTopicChange,
  selectedCategoryType,
  onCategoryTypeChange,
  availableTopics,
  availableCategoryTypes,
}: ResourceFiltersProps) {
  const handleClearAll = () => {
    onTopicChange('all');
    onCategoryTypeChange('all');
  };

  const hasActiveFilters = selectedTopic !== 'all' || selectedCategoryType !== 'all';

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

      {/* Topic Filter */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Topic</Label>
        <Select value={selectedTopic} onValueChange={onTopicChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Topics</SelectItem>
            {availableTopics.map((topic) => (
              <SelectItem key={topic} value={topic}>
                {topic.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category Type Filter */}
      {availableCategoryTypes.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Category Type</Label>
          <Select value={selectedCategoryType} onValueChange={onCategoryTypeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {availableCategoryTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
