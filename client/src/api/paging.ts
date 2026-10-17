// Matches the server's upper limit for the page number.
const maxPage = 100_000

// Reads a page number from the URL, falling back to page 1 for anything invalid.
export function readPage(value: string | null) {
  const page = Number(value)
  return Number.isInteger(page) && page >= 1 && page <= maxPage ? page : 1
}
