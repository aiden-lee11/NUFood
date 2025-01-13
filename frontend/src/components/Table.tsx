import React from 'react';

// Types for our context
type TableConfig = {
  compact?: boolean;
  bordered?: boolean;
  zebra?: boolean;
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
  zebra?: boolean;
}

export const Table: React.FC<TableProps> = ({
  children,
  className = '',
  compact = false,
  bordered = false,
  zebra = false,
  ...props
}) => {
  return (
    <TableContext.Provider value={{ compact, bordered, zebra }}>
      <div className="w-full overflow-x-auto">
        <table
          {...props}
          className={`w-full text-sm border-collapse ${bordered ? 'border border-zinc-200 dark:border-zinc-700' : ''
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
    className={`bg-zinc-50 dark:bg-zinc-800 ${className}`}
  >
    {children}
  </thead>
);

export const TableBody: React.FC<TableBaseProps> = ({
  children,
  className = '',
  ...props
}) => {
  const { zebra } = React.useContext(TableContext);
  return (
    <tbody
      {...props}
      className={`${zebra ? '[&>tr:nth-child(odd)]:bg-zinc-50 dark:[&>tr:nth-child(odd)]:bg-zinc-800/50' : ''
        } ${className}`}
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
      ${isClickable ? 'cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700/50' : ''}
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
        text-left font-semibold text-zinc-700 dark:text-zinc-300
        ${compact ? 'px-3 py-2' : 'px-4 py-3'}
        ${bordered ? 'border border-zinc-200 dark:border-zinc-700' : 'border-b border-zinc-200 dark:border-zinc-700'}
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
        text-zinc-600 dark:text-zinc-400
        ${compact ? 'px-3 py-2' : 'px-4 py-3'}
        ${bordered ? 'border border-zinc-200 dark:border-zinc-700' : ''}
        ${className}
      `}
    >
      {children}
    </td>
  );
};

export default Table;
