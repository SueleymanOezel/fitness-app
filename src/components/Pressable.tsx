import { useImperativeHandle, useRef, type ButtonHTMLAttributes, type ComponentProps, type Ref } from 'react'
import { Link } from 'react-router-dom'
import { usePressFeedback } from '../lib/use-press-feedback'
import { buttonDangerClass, buttonPrimaryClass, buttonSecondaryClass } from '../lib/ui-classes'

export type PressableVariant = 'primary' | 'secondary' | 'danger' | 'bare'

const variantClass: Record<PressableVariant, string> = {
  primary: buttonPrimaryClass,
  secondary: buttonSecondaryClass,
  danger: buttonDangerClass,
  bare: '',
}

function join(variant: PressableVariant, className: string) {
  return [variantClass[variant], className].filter(Boolean).join(' ')
}

type PressableProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: PressableVariant
  ref?: Ref<HTMLButtonElement>
}

/**
 * The only place a raw <button> may appear (enforced by ESLint): every
 * interactive element in the app gets the same tap feedback this way. Passes
 * `type` through untouched — a button without one stays a submit button.
 */
export default function Pressable({ variant = 'bare', className = '', ref, ...props }: PressableProps) {
  const inner = useRef<HTMLButtonElement>(null)
  useImperativeHandle(ref, () => inner.current as HTMLButtonElement)
  usePressFeedback(inner)
  return <button ref={inner} className={join(variant, className)} {...props} />
}

type PressableLinkProps = ComponentProps<typeof Link> & {
  variant?: PressableVariant
  ref?: Ref<HTMLAnchorElement>
}

export function PressableLink({ variant = 'bare', className, ref, ...props }: PressableLinkProps) {
  const inner = useRef<HTMLAnchorElement>(null)
  useImperativeHandle(ref, () => inner.current as HTMLAnchorElement)
  usePressFeedback(inner)
  const resolved = typeof className === 'function' ? className : join(variant, className ?? '')
  return <Link ref={inner} className={resolved} {...props} />
}
