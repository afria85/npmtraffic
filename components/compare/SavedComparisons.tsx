'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { comparisonKey, parseSavedComparisons, saveComparisons, SAVED_COMPARISONS_KEY, type SavedComparison } from '@/lib/saved-comparisons';
import { canonicalizePackages } from '@/lib/query';

export default function SavedComparisons({packages = [], days = 30}: {packages?: string[]; days?: number}) {
  const [items,setItems] = useState<SavedComparison[]>([]);
  const [message,setMessage] = useState('');
  useEffect(() => {
    const load = () => {
      try { setItems(parseSavedComparisons(localStorage.getItem(SAVED_COMPARISONS_KEY))); }
      catch { setMessage('Browser storage is unavailable.'); }
    };
    load();
    window.addEventListener('storage',load);
    return () => window.removeEventListener('storage',load);
  },[]);
  function update(next: SavedComparison[]) {
    try { setItems(saveComparisons(localStorage,next)); setMessage('Saved comparisons updated in this browser.'); }
    catch { setMessage('Could not save. Browser storage may be full or disabled.'); }
  }
  const current = { packages: canonicalizePackages(packages), days };
  const saved = items.some(item => comparisonKey(item) === comparisonKey(current));
  return <section aria-label="Saved comparisons" className="space-y-2 text-sm">
    <h2 className="font-semibold">Saved comparisons</h2>
    <p>Stored only in this browser. Up to 20 comparisons.</p>
    {packages.length >= 2 && <button type="button" className="min-h-11 underline" disabled={saved || items.length >= 20} onClick={() => update([...items,current])}>{saved ? 'Comparison saved' : 'Save this comparison'}</button>}
    <ul>{items.map(item => <li key={comparisonKey(item)} className="flex flex-wrap items-center gap-3">
      <Link className="underline min-h-11 inline-flex items-center" href={`/compare?packages=${item.packages.map(encodeURIComponent).join(',')}&days=${item.days}`}>{item.packages.join(' vs ')} ({item.days}d)</Link>
      <button type="button" className="min-h-11 underline" aria-label={`Remove ${item.packages.join(' vs ')} (${item.days}d)`} onClick={() => update(items.filter(value => comparisonKey(value)!==comparisonKey(item)))}>Remove</button>
    </li>)}</ul>
    <p role="status">{message}</p>
  </section>;
}
