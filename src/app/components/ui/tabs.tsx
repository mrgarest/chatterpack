import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import * as TabsPrimitive from "@radix-ui/react-tabs" // Переконайся, що імпорт правильний

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "inline-flex w-fit items-center justify-start text-muted-foreground",
  {
    variants: {
      variant: {
        default: "bg-muted rounded-lg p-[3px] h-9",
        line: "gap-6 bg-transparent border-b w-full rounded-none h-auto p-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // text
        "relative inline-flex items-center justify-center gap-2 px-1 py-2 text-sm font-medium whitespace-nowrap transition-all outline-none disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer",
        "text-muted-foreground hover:text-foreground data-[state=active]:text-foreground",
        
        // DEFAULT
        "group-data-[variant=default]/tabs-list:data-[state=active]:bg-background group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm group-data-[variant=default]/tabs-list:rounded-md",
        
        // LINE
        "group-data-[variant=line]/tabs-list:px-0 group-data-[variant=line]/tabs-list:pb-3 group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:border-none",
        
        // Primary line
        "after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:scale-x-0 after:bg-primary after:transition-transform after:duration-200",
        "data-[state=active]:after:scale-x-100",
        
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none mt-4", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }