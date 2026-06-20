export async function query(fn) {
  const { data, error } = await fn()
  if (error) throw error
  return data
}
