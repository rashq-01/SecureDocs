import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const Breadcrumbs = ({ items }) => {
  return (
    <nav className="flex items-center gap-2 text-sm mb-4">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            {index > 0 && <ChevronRight size={14} className="text-text-tertiary" />}
            {isLast ? (
              <span className="text-text-primary font-medium">{item.label}</span>
            ) : (
              <Link to={item.path} className="text-text-secondary hover:text-text-primary">
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;