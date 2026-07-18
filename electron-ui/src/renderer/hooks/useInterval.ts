import { useEffect, useRef } from 'react'

export function useInterval(callback: () => void, delayMs: number | null) {
  const savedCb = useRef(callback)
  useEffect(() => { savedCb.current = callback }, [callback])
  useEffect(() => {
    if (delayMs === null) return
    const id = setInterval(() => savedCb.current(), delayMs)
    return () => clearInterval(id)
  }, [delayMs])
}
