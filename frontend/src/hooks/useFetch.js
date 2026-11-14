import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '../services/api'

/**
 * Загрузка данных из API с состояниями loading / error и повторной загрузкой.
 * deps — зависимости, при изменении которых запрос выполняется заново.
 */
export function useFetch(fetcher, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const requestId = useRef(0)

  const load = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      if (id === requestId.current) setData(result)
    } catch (e) {
      if (id === requestId.current) setError(errorMessage(e))
    } finally {
      if (id === requestId.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    load()
  }, [load])

  return { data, setData, loading, error, reload: load }
}
