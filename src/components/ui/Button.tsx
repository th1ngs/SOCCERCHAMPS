import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

const base =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-display font-bold uppercase tracking-wide " +
  "transition-[transform,background-color,box-shadow,color,filter] duration-150 ease-out " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400 " +
  "disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none aria-busy:cursor-progress";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-linear-to-b from-gold-300 to-gold-500 text-ink-950 shadow-gold " +
    "hover:brightness-105 active:translate-y-[3px] active:shadow-[0_1px_0_var(--color-gold-700)] disabled:active:translate-y-0",
  secondary:
    "bg-ink-600 text-snow ring-1 ring-inset ring-white/10 shadow-[0_3px_0_var(--color-ink-950)] " +
    "hover:bg-ink-500 active:translate-y-[2px] active:shadow-[0_1px_0_var(--color-ink-950)] disabled:active:translate-y-0",
  outline: "text-snow ring-1 ring-inset ring-white/15 hover:bg-white/6 hover:ring-white/25 active:bg-white/10",
  ghost: "text-mist hover:bg-white/6 hover:text-snow active:bg-white/10",
  danger:
    "bg-danger-500 text-white shadow-[0_3px_0_var(--color-danger-700)] hover:bg-danger-400 " +
    "active:translate-y-[2px] active:shadow-[0_1px_0_var(--color-danger-700)] disabled:active:translate-y-0",
  success:
    "bg-pitch-500 text-white shadow-[0_3px_0_var(--color-pitch-700)] hover:bg-pitch-400 " +
    "active:translate-y-[2px] active:shadow-[0_1px_0_var(--color-pitch-700)] disabled:active:translate-y-0",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] [&_svg]:size-4",
  md: "h-10 px-4 text-[15px] [&_svg]:size-[18px]",
  lg: "h-12 px-6 text-lg [&_svg]:size-5",
  icon: "size-10 [&_svg]:size-[18px]",
  "icon-sm": "size-8 rounded-lg [&_svg]:size-4",
};

export function buttonClasses(variant: ButtonVariant = "secondary", size: ButtonSize = "md", block = false, className?: string) {
  return cn(base, variants[variant], sizes[size], block && "w-full", className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Mostra um indicador de carregamento e bloqueia cliques. */
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  block?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  icon,
  iconRight,
  block,
  className,
  children,
  disabled,
  type = "button",
  ref,
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, block, className)}
      {...rest}
    >
      {loading ? <LoaderCircle className="animate-spin" aria-hidden /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  );
}

/** Botão só com ícone: exige rótulo acessível. */
export function IconButton({ label, ...props }: Omit<ButtonProps, "children"> & { label: string }) {
  return <Button size={props.size ?? "icon"} variant={props.variant ?? "outline"} aria-label={label} title={label} {...props} />;
}
