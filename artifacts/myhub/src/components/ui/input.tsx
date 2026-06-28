import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    // For specific types, enforce English language to display standard western numbers (0-9)
    // instead of Arabic-Indic numerals, and enforce left-to-right direction.
    const isEnforceEnglish = type === "number" || type === "tel" || type === "email" || type === "password";
    
    return (
      <input
        type={type}
        lang={isEnforceEnglish ? "en" : props.lang}
        dir={isEnforceEnglish ? "ltr" : props.dir}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          isEnforceEnglish && "text-left",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
