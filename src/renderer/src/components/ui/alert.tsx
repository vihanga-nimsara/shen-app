import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

function Alert({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div role="alert" className={cn('ui-alert', className)} {...props} />
}

function AlertTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className={cn('ui-alert-title', className)} {...props} />
}

function AlertDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <div className={cn('ui-alert-description', className)} {...props} />
}

function AlertAction({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('ui-alert-action', className)} {...props} />
}

export { Alert, AlertTitle, AlertDescription, AlertAction }
