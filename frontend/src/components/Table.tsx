import React from 'react';

// Types for our context
type TableConfig = {
  compact?: boolean;
  bordered?: boolean;
  darkMode?: boolean;
}

const TableContext = React.createContext<TableConfig>({});

interface TableBaseProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
}

interface TableProps extends TableBaseProps {
  compact?: boolean;
  bordered?: boolean;
}

export const Table: React.FC<TableProps> = ({
  children,
  className = '',
  compact = false,
  bordered = false,
  ...props
}) => {
  return (
    <TableContext.Provider value={{ compact, bordered }}>
      <div className="w-full overflow-x-auto">
        <table
          {...props}
          className={`w-full text-sm border-collapse ${bordered ? 'border border-border' : ''
            } ${className}`}
        >
          {children}
        </table>
      </div>
    </TableContext.Provider>
  );
};

export const TableHead: React.FC<TableBaseProps> = ({
  children,
  className = '',
  ...props
}) => (
  <thead
    {...props}
    className={className}
  >
    {children}
  </thead>
);

export const TableBody: React.FC<TableBaseProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <tbody
      {...props}
      className={className}
    >
      {children}
    </tbody>
  );
};

export const TableRow: React.FC<TableBaseProps & {
  isClickable?: boolean
}> = ({
  children,
  className = '',
  isClickable,
  ...props
}) => (
    <tr
      {...props}
      className={`
      ${isClickable ? 'cursor-pointer hover:bg-muted/50' : ''}
      ${className}
    `}
    >
      {children}
    </tr>
  );

export const TableHeader: React.FC<TableBaseProps> = ({
  children,
  className = '',
  ...props
}) => {
  const { compact, bordered } = React.useContext(TableContext);
  return (
    <th
      {...props}
      className={`
        text-left font-semibold
        ${compact ? 'px-3 py-2' : 'px-4 py-3'}
        ${bordered ? 'border border-border' : 'border-b border-border'}
        ${className}
      `}
    >
      {children}
    </th>
  );
};

export const TableCell: React.FC<TableBaseProps> = ({
  children,
  className = '',
  ...props
}) => {
  const { compact, bordered } = React.useContext(TableContext);
  return (
    <td
      {...props}
      className={`
        text-card-foreground
        ${compact ? 'px-3 py-2' : 'px-4 py-3'}
        ${bordered ? 'border border-border' : ''}
        ${className}
      `}
    >
      {children}
    </td>
  );
};

export default Table;

// Utility overlay to draw vertical column dividers over dynamic layouts
// Useful when content (like absolute overlays) would otherwise cover cell borders
export const ColumnDividerOverlay: React.FC<{
  columns: number;
  leftGutterPx?: number; // static gutter before the first column (e.g., time label width)
  className?: string;
  colorClassName?: string; // tailwind color class, default uses border color with reduced opacity
}> = ({
  columns,
  leftGutterPx = 0,
  className = '',
  colorClassName = 'bg-border/30'
}) => {
  const lines = Array.from({ length: Math.max(0, columns - 1) }, (_, i) => i + 1);
  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`}>
      {lines.map((idx) => (
        <div
          key={idx}
          className={`absolute top-0 h-full w-px ${colorClassName}`}
          style={{
            left: `calc(${leftGutterPx}px + (100% - ${leftGutterPx}px) * ${idx / columns})`
          }}
        />
      ))}
    </div>
  );
};
