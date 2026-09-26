'use client';
import { useState, useTransition, type ReactNode } from 'react';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Modal } from './modal';
import { deleteInventory } from '@/app/admin/actions';

type Row = { id: string; sku: string; title: string; quantity: number; low_stock_threshold: number };

export function InventoryTable({ rows, editors, editable }: { rows: Row[]; editors: ReactNode[]; editable: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState(false);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  return <>
    <div className="table-wrap"><table><thead><tr><th>SKU</th><th>Inventory item</th><th>Quantity</th><th>Low-stock threshold</th><th className="actions-cell">Actions</th></tr></thead>
      <tbody>{rows.map((row) => <tr key={row.id}><td>{row.sku}</td><td>{row.title}</td><td>{row.quantity}</td><td>{row.low_stock_threshold}</td><td className="actions-cell"><div className="table-actions">
        <button type="button" className="icon-button" title="View" aria-label={`View ${row.title}`} onClick={() => { setSelected(row.id); setView(true); }}><Eye size={18}/></button>
        {editable && <><button type="button" className="icon-button" title="Edit" aria-label={`Edit ${row.title}`} onClick={() => { setSelected(row.id); setView(false); }}><Pencil size={18}/></button>
        <button type="button" className="icon-button error" title="Delete" aria-label={`Delete ${row.title}`} onClick={() => { setError(''); setDeleting(row); }}><Trash2 size={18}/></button></>}
      </div></td></tr>)}</tbody></table></div>
    {selected && <Modal title={view ? 'View inventory item' : 'Edit inventory item'} onClose={() => setSelected(null)}><fieldset disabled={view || !editable} style={{border:0}}>{editors[rows.findIndex(r => r.id === selected)]}</fieldset></Modal>}
    {deleting && <Modal title="Delete inventory item?" onClose={() => !pending && setDeleting(null)}><div className="stack" style={{textAlign:'left'}}><p>Delete {deleting.title}?</p>{error && <div role="alert" className="notice error">{error}</div>}<div className="row"><button type="button" className="button secondary" disabled={pending} onClick={() => setDeleting(null)}>Cancel</button><button type="button" className="button danger" disabled={pending} onClick={() => start(async () => { const result=await deleteInventory(deleting.id); setError(result.error || ''); if(!result.error) setDeleting(null); })}>{pending ? 'Deleting…' : 'Delete inventory item'}</button></div></div></Modal>}
  </>;
}
