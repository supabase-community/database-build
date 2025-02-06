import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getWorkerURL(url: URL | string) {
  return URL.createObjectURL(
    new Blob(
      [
        /* JS */ `import * as workerModule from "${url.toString()}";Object.assign(self, workerModule);`,
      ],
      { type: 'text/javascript' }
    )
  )
}
