export async function pollUntil<T>(
  fetchFn: () => Promise<T>,
  completionCheck: (data: T) => boolean,
  timeoutMs: number = 5000
): Promise<void> {
  const startTime = Date.now()

  async function poll(): Promise<void> {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error('Polling timeout')
    }

    const data = await fetchFn()
    const result = completionCheck(data)

    if (result) {
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 100))
    return poll()
  }

  return poll()
}
