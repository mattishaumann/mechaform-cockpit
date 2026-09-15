import { supabase } from './supabase'

// Display names for ids on the current page. A lookup, not a computation.
export async function getNames(supplierIds: number[], articleIds: number[]) {
  const [s, a] = await Promise.all([
    supplierIds.length ? supabase.from('suppliers').select('supplier_no,name').in('supplier_no', supplierIds) : Promise.resolve({ data: [], error: null }),
    articleIds.length ? supabase.from('articles').select('article_no,description').in('article_no', articleIds) : Promise.resolve({ data: [], error: null }),
  ])
  if (s.error) throw new Error(s.error.message)
  if (a.error) throw new Error(a.error.message)
  return {
    suppliers: Object.fromEntries((s.data ?? []).map((r) => [r.supplier_no, r.name])) as Record<number, string>,
    articles: Object.fromEntries((a.data ?? []).map((r) => [r.article_no, r.description])) as Record<number, string>,
  }
}
