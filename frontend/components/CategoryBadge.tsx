'use client';

import { Category } from '@/types';

interface CategoryBadgeProps {
  category: Category;
  size?: 'sm' | 'md' | 'lg';
}

export default function CategoryBadge({ category, size = 'sm' }: CategoryBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const bgColor = category.color || '#3b82f6';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]}`}
      style={{
        backgroundColor: `${bgColor}20`,
        color: bgColor,
      }}
    >
      {category.icon && <span className="mr-1">{category.icon}</span>}
      {category.name}
    </span>
  );
}

