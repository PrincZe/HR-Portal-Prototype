'use client';

import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ResourceFiltersProps {
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  selectedFileTypes: string[];
  onFileTypesChange: (types: string[]) => void;
  availableCategories: string[];
  availableFileTypes: string[];
}

export function ResourceFilters({
  selectedCategories,
  onCategoriesChange,
  selectedFileTypes,
  onFileTypesChange,
  availableCategories,
  availableFileTypes,
}: ResourceFiltersProps) {
  const handleCategoryToggle = (category: string) => {
    if (selectedCategories.includes(category)) {
      onCategoriesChange(selectedCategories.filter(c => c !== category));
    } else {
      onCategoriesChange([...selectedCategories, category]);
    }
  };

  const handleFileTypeToggle = (type: string) => {
    if (selectedFileTypes.includes(type)) {
      onFileTypesChange(selectedFileTypes.filter(t => t !== type));
    } else {
      onFileTypesChange([...selectedFileTypes, type]);
    }
  };

  const handleClearAll = () => {
    onCategoriesChange([]);
    onFileTypesChange([]);
  };

  const hasActiveFilters = selectedCategories.length > 0 || selectedFileTypes.length > 0;

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

      {/* Category Filters */}
      {availableCategories.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Category</Label>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2 pr-4">
              {availableCategories.map((category) => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cat-${category}`}
                    checked={selectedCategories.includes(category)}
                    onCheckedChange={() => handleCategoryToggle(category)}
                  />
                  <label
                    htmlFor={`cat-${category}`}
                    className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {category}
                  </label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* File Type Filters */}
      {availableFileTypes.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">File Type</Label>
          <ScrollArea className="h-[150px]">
            <div className="space-y-2 pr-4">
              {availableFileTypes.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${type}`}
                    checked={selectedFileTypes.includes(type)}
                    onCheckedChange={() => handleFileTypeToggle(type)}
                  />
                  <label
                    htmlFor={`type-${type}`}
                    className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer uppercase"
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
