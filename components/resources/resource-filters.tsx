'use client';

import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ResourceFiltersProps {
  selectedTopics: string[];
  onTopicsChange: (topics: string[]) => void;
  selectedCategoryTypes: string[];
  onCategoryTypesChange: (types: string[]) => void;
  availableTopics: string[];
  availableCategoryTypes: string[];
}

export function ResourceFilters({
  selectedTopics,
  onTopicsChange,
  selectedCategoryTypes,
  onCategoryTypesChange,
  availableTopics,
  availableCategoryTypes,
}: ResourceFiltersProps) {
  const handleTopicToggle = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      onTopicsChange(selectedTopics.filter(t => t !== topic));
    } else {
      onTopicsChange([...selectedTopics, topic]);
    }
  };

  const handleCategoryTypeToggle = (type: string) => {
    if (selectedCategoryTypes.includes(type)) {
      onCategoryTypesChange(selectedCategoryTypes.filter(t => t !== type));
    } else {
      onCategoryTypesChange([...selectedCategoryTypes, type]);
    }
  };

  const handleClearAll = () => {
    onTopicsChange([]);
    onCategoryTypesChange([]);
  };

  const hasActiveFilters = selectedTopics.length > 0 || selectedCategoryTypes.length > 0;

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

      {/* Topic Filters */}
      {availableTopics.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Topic</Label>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2 pr-4">
              {availableTopics.map((topic) => (
                <div key={topic} className="flex items-center space-x-2">
                  <Checkbox
                    id={`topic-${topic}`}
                    checked={selectedTopics.includes(topic)}
                    onCheckedChange={() => handleTopicToggle(topic)}
                  />
                  <label
                    htmlFor={`topic-${topic}`}
                    className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer capitalize"
                  >
                    {topic.replace(/_/g, ' ')}
                  </label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Category Type Filters */}
      {availableCategoryTypes.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Category Type</Label>
          <ScrollArea className="h-[150px]">
            <div className="space-y-2 pr-4">
              {availableCategoryTypes.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cat-type-${type}`}
                    checked={selectedCategoryTypes.includes(type)}
                    onCheckedChange={() => handleCategoryTypeToggle(type)}
                  />
                  <label
                    htmlFor={`cat-type-${type}`}
                    className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer capitalize"
                  >
                    {type}
                  </label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
