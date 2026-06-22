"use client"

import * as React from "react"
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"
import { type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { toggleVariants } from "@/components/ui/toggle"

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants>
>({
  size: "default",
  variant: "default",
})

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, children, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn("flex items-center justify-center gap-1", className)}
    {...props}
  >
    <ToggleGroupContext.Provider value={{ variant, size }}>
      {children}
    </ToggleGroupContext.Provider>
  </ToggleGroupPrimitive.Root>
))

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName

const ToggleGroupItem = React.forwardRef<
<<<<<<< HEAD
  React.ElementRef<typeof ToggleGroupPritive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPritive.Item> &
=======
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> &
>>>>>>> 77cfbcae63ce667f37dda7a09a8db3815f4aef37
    VariantProps<typeof toggleVariants>
>(({ className, children, variant, size, ...props }, ref) => {
  const context = React.useContext(ToggleGroupContext)

  return (
<<<<<<< HEAD
    <ToggleGroupPritive.Item
=======
    <ToggleGroupPrimitive.Item
>>>>>>> 77cfbcae63ce667f37dda7a09a8db3815f4aef37
      ref={ref}
      className={cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        className
      )}
      {...props}
    >
      {children}
<<<<<<< HEAD
    </ToggleGroupPritive.Item>
  )
})

ToggleGroupItem.displayName = ToggleGroupPritive.Item.displayName
=======
    </ToggleGroupPrimitive.Item>
  )
})

ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName
>>>>>>> 77cfbcae63ce667f37dda7a09a8db3815f4aef37

export { ToggleGroup, ToggleGroupItem }
