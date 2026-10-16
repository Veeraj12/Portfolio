import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "outline" | "ghost";

interface BaseProps {
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
}

interface ButtonAsLink extends BaseProps {
  href: string;
  external?: boolean;
  /** When set, the link downloads the file instead of navigating to it. */
  download?: string;
}

interface ButtonAsButton extends BaseProps,
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> {
  href?: undefined;
}

type Props = ButtonAsLink | ButtonAsButton;

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-fg border border-accent hover:opacity-90",
  outline:
    "bg-transparent text-fg border border-border hover:border-accent hover:text-accent",
  ghost:
    "bg-transparent text-fg border border-transparent hover:bg-hover",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded px-5 py-2.5 text-sm font-medium transition duration-200 ease-engineered hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-accent motion-reduce:transform-none";

export function Button(props: Props) {
  const { variant = "primary", className, children } = props;

  if ("href" in props && props.href) {
    const { href, external, download } = props;
    if (download) {
      return (
        <a
          href={href}
          download={download}
          className={cn(base, variantClasses[variant], className)}
        >
          {children}
        </a>
      );
    }
    if (external) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(base, variantClasses[variant], className)}
        >
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={cn(base, variantClasses[variant], className)}>
        {children}
      </Link>
    );
  }

  const { variant: _v, className: _c, children: _ch, href: _h, ...rest } =
    props as ButtonAsButton;

  return (
    <button className={cn(base, variantClasses[variant], className)} {...rest}>
      {children}
    </button>
  );
}
