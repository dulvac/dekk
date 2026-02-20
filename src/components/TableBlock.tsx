import type { HTMLAttributes } from 'react'
import styles from '../styles/slides.module.css'

export function Table({ children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <table className={styles.table} {...props}>
      {children}
    </table>
  )
}

export function TableHead({ children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={styles.tableHeader} {...props}>
      {children}
    </thead>
  )
}

export function TableRow({ children, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={styles.tableRow} {...props}>
      {children}
    </tr>
  )
}

export function TableHeaderCell({ children, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={styles.tableHeaderCell} {...props}>
      {children}
    </th>
  )
}

export function TableCell({ children, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={styles.tableCell} {...props}>
      {children}
    </td>
  )
}
