import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getWorkerURL(url: URL | string) {
  return URL.createObjectURL(
    new Blob([`importScripts("${url.toString()}");`], { type: 'text/javascript' })
  )
}
