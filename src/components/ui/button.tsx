import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-sans font-medium transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#223159] text-[#FAFAFA] border border-transparent hover:bg-[#FAFAFA] hover:text-[#223159] hover:border-[#223159]",
        destructive:
          "bg-[#DC2626] text-[#FAFAFA] hover:bg-[#B91C1C]",
        outline:
          "border border-[#223159] bg-transparent text-[#223159] hover:bg-[#223159] hover:text-[#FAFAFA]",
        secondary:
          "bg-[#E8E8E5] text-[#0E131B] hover:bg-[#D4D4D0]",
        ghost: "hover:bg-[#E8E8E5] text-[#0E131B] transition-colors duration-200",
        link: "text-[#223159] underline-offset-4 decoration-2 decoration-[#AFD135] hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-8",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
