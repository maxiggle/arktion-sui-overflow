"use client";

import Link from "next/link";
import { Menu, ArrowRight } from "lucide-react";
import { publicNavItems } from "@/lib/public-content";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MobileNavAuthActions } from "@/components/site/auth-nav-actions";

export function PublicMobileNav() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="md:hidden">
          <Menu className="size-4" />
          <span className="sr-only">Open navigation</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[86vw] sm:w-96">
        <SheetHeader className="border-b border-border/60 pb-4">
          <SheetTitle className="font-heading text-xl">Arktion</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-2 px-4 py-4">
          {publicNavItems.map((item) => (
            <SheetClose asChild key={item.href}>
              <Button asChild variant="ghost" className="justify-between px-2">
                <Link href={item.href}>
                  {item.label}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </SheetClose>
          ))}
          <div className="mt-auto grid gap-2 border-t border-border/60 pt-4">
            <MobileNavAuthActions />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
