'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronsUpDown,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutGrid,
  Boxes,
  ShieldCheck,
  ScrollText,
  Network,
  GitBranch,
  ShieldAlert,
  Webhook,
  Users,
  KeyRound,
  Building2,
  Plus,
  LogOut,
  Ellipsis,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc/shared';
import { signOut } from '@/lib/auth-client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Avatar } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/theme-toggle';

interface SidebarUser {
  name?: string | null;
  email: string;
  image?: string | null;
}

interface NavEntry {
  href: string;
  label: string;
  icon: LucideIcon;
  key: string;
  matchExact?: boolean;
}

function NavItem({
  href,
  icon: Icon,
  label,
  isActive,
  collapsed,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  collapsed: boolean;
}) {
  const classes = cn(
    'group/nav relative flex h-8 w-full items-center rounded-md text-[13px] transition-colors',
    isActive
      ? 'bg-accent text-foreground'
      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
    collapsed ? 'justify-center px-0' : 'gap-2.5 px-2',
  );
  const content = (
    <Link href={href} className={classes}>
      <Icon className="size-[15px] shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
      {isActive && !collapsed && <span className="ml-auto h-4 w-[2px] bg-primary" />}
    </Link>
  );
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }
  return content;
}

function NavSection({
  label,
  collapsed,
  children,
}: {
  label: string;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-0.5">
      <div className={cn('overflow-hidden transition-all duration-300', collapsed ? 'h-0' : 'h-5')}>
        <div className="cav-label flex h-5 items-center px-2">{label}</div>
      </div>
      {children}
    </div>
  );
}

export function CavalrySidebar({
  user,
  orgSlug,
  orgName,
  isAdmin,
}: {
  user: SidebarUser;
  orgSlug: string;
  orgName: string;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const prefix = `/${orgSlug}`;

  const { data: orgs } = trpc.me.organizations.useQuery();

  const governance: NavEntry[] = [
    { href: prefix, label: 'Overview', icon: LayoutGrid, key: 'overview', matchExact: true },
    { href: `${prefix}/skills`, label: 'Skills', icon: Boxes, key: 'skills' },
    { href: `${prefix}/audit`, label: 'Audit log', icon: ScrollText, key: 'audit' },
  ];
  const policy: NavEntry[] = [
    { href: `${prefix}/registries`, label: 'Registries', icon: Network, key: 'registries' },
    { href: `${prefix}/skill-repos`, label: 'Skill repos', icon: GitBranch, key: 'skill-repos' },
    { href: `${prefix}/policies`, label: 'Policies', icon: ShieldCheck, key: 'policies' },
    { href: `${prefix}/approvals`, label: 'Approvals', icon: ShieldAlert, key: 'approvals' },
  ];
  const settings: NavEntry[] = [
    {
      href: `${prefix}/settings/workspaces`,
      label: 'Workspaces',
      icon: Building2,
      key: 'workspaces',
    },
    { href: `${prefix}/settings/members`, label: 'Members', icon: Users, key: 'members' },
  ];
  if (isAdmin) {
    settings.push({
      href: `${prefix}/settings/tokens`,
      label: 'API tokens',
      icon: KeyRound,
      key: 'tokens',
    });
    settings.push({
      href: `${prefix}/settings/integrations`,
      label: 'Integrations',
      icon: Webhook,
      key: 'integrations',
    });
  }

  const isActive = (entry: NavEntry) => {
    if (entry.matchExact) return pathname === entry.href;
    return pathname === entry.href || pathname?.startsWith(`${entry.href}/`);
  };

  const toggleBtn = (
    <button
      onClick={() => setCollapsed((v) => !v)}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <div className="relative grid size-4 place-items-center">
        <PanelLeftClose
          className={cn('absolute size-4 transition-all', collapsed ? 'scale-0' : 'scale-100')}
        />
        <PanelLeftOpen
          className={cn('absolute size-4 transition-all', collapsed ? 'scale-100' : 'scale-0')}
        />
      </div>
    </button>
  );

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          'flex h-full shrink-0 flex-col justify-between overflow-hidden px-2 pb-2 pt-2 transition-all duration-300 ease-in-out',
          collapsed ? 'w-[52px]' : 'w-[228px]',
        )}
      >
        {/* Top */}
        <div className="flex flex-1 flex-col gap-3 overflow-hidden">
          {/* Brand + org switcher */}
          <div
            className={cn('flex h-10 items-center gap-2', collapsed ? 'justify-center' : 'px-1')}
          >
            {!collapsed ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="group flex min-w-0 flex-1 items-center gap-2 rounded-md p-1 -ml-1 outline-none transition-colors hover:bg-accent">
                  <div className="relative flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <span className="cav-display text-[15px] leading-none">C</span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col text-left">
                    <span className="truncate text-[13px] font-medium leading-tight">
                      {orgName}
                    </span>
                    <span className="cav-label leading-tight">Cavalry</span>
                  </div>
                  <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" sideOffset={4} className="w-56">
                  {orgs?.map((o) => (
                    <DropdownMenuItem
                      key={o.id}
                      onSelect={() => router.push(`/${o.slug}`)}
                      className={o.slug === orgSlug ? 'bg-accent' : ''}
                    >
                      <div className="flex size-5 items-center justify-center rounded bg-primary text-primary-foreground font-medium text-[10px]">
                        {o.name[0]?.toUpperCase() ?? 'O'}
                      </div>
                      <span className="truncate">{o.name}</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => router.push('/onboarding')}>
                    <Plus className="size-4" />
                    Create organization
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            {toggleBtn}
          </div>

          {/* Nav */}
          <div className="flex flex-col gap-3">
            <NavSection label="Governance" collapsed={collapsed}>
              {governance.map((e) => (
                <NavItem
                  key={e.key}
                  href={e.href}
                  icon={e.icon}
                  label={e.label}
                  isActive={isActive(e)}
                  collapsed={collapsed}
                />
              ))}
            </NavSection>
            <NavSection label="Registries" collapsed={collapsed}>
              {policy.map((e) => (
                <NavItem
                  key={e.key}
                  href={e.href}
                  icon={e.icon}
                  label={e.label}
                  isActive={isActive(e)}
                  collapsed={collapsed}
                />
              ))}
            </NavSection>
            <NavSection label="Organization" collapsed={collapsed}>
              {settings.map((e) => (
                <NavItem
                  key={e.key}
                  href={e.href}
                  icon={e.icon}
                  label={e.label}
                  isActive={isActive(e)}
                  collapsed={collapsed}
                />
              ))}
            </NavSection>
          </div>
        </div>

        {/* Bottom: user menu */}
        <UserMenu user={user} collapsed={collapsed} />
      </aside>
    </TooltipProvider>
  );
}

function UserMenu({ user, collapsed }: { user: SidebarUser; collapsed: boolean }) {
  const router = useRouter();
  const displayName = user.name ?? user.email.split('@')[0] ?? 'User';

  const trigger = (
    <PopoverTrigger
      className={cn(
        'flex min-w-0 flex-1 items-center gap-2 rounded-md outline-none transition-colors hover:bg-accent',
        collapsed ? 'size-8 justify-center p-0' : 'p-1.5',
      )}
    >
      <Avatar name={displayName} className="size-7 shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1 truncate text-left text-[13px] font-medium">{displayName}</span>
          <Ellipsis className="size-4 shrink-0 text-muted-foreground" />
        </>
      )}
    </PopoverTrigger>
  );

  return (
    <div className="flex flex-col gap-2 pt-2">
      <Popover>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>{trigger}</TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {displayName}
            </TooltipContent>
          </Tooltip>
        ) : (
          trigger
        )}
        <PopoverContent
          side={collapsed ? 'right' : 'top'}
          align="start"
          sideOffset={8}
          className="w-64 p-0"
        >
          <div className="flex items-center gap-3 p-3">
            <Avatar name={displayName} className="size-8 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground leading-tight mt-0.5">
                {user.email}
              </p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between px-3 py-2.5">
            <span className="cav-label">Theme</span>
            <ThemeToggle />
          </div>
          <Separator />
          <div className="p-1">
            <button
              onClick={async () => {
                await signOut();
                toast.success('Signed out');
                router.push('/');
                router.refresh();
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
            >
              <LogOut className="size-4 text-muted-foreground" />
              Sign out
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
