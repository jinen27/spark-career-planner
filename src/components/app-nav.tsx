import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Menu, SignOut, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function AppNav({ initials = "ST" }: { initials?: string }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const signOut = async () => {
    await queryClient.cancelQueries(); queryClient.clear(); await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  const links = [{ to: "/dashboard", label: "Dashboard" }, { to: "/assessment", label: "Assessment" }, { to: "/profile", label: "Profile" }] as const;
  return <nav className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
    <div className="mx-auto grid h-16 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 sm:px-6 md:flex md:justify-between">
      <div className="flex min-w-0 items-center gap-8"><Link to="/dashboard" className="truncate font-black tracking-tighter text-xl uppercase">Compass</Link>
        <div className="hidden gap-6 text-sm font-medium text-muted-foreground md:flex">{links.map((link) => <Link key={link.to} to={link.to} activeProps={{ className: "text-foreground" }} className="transition-colors hover:text-foreground">{link.label}</Link>)}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2"><div className="grid size-8 place-items-center rounded-full border border-primary/20 bg-primary/10 text-[10px] font-bold text-primary">{initials}</div>
        <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={signOut} aria-label="Sign out"><SignOut /></Button>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle navigation">{open ? <X /> : <Menu />}</Button>
      </div>
    </div>
    {open && <div className="border-t border-border bg-background px-5 py-4 md:hidden">{links.map((link) => <Link key={link.to} to={link.to} onClick={() => setOpen(false)} className="block py-3 text-sm font-semibold">{link.label}</Link>)}<Button variant="ghost" className="mt-2 w-full justify-start" onClick={signOut}><SignOut /> Sign out</Button></div>}
  </nav>;
}