import {
  LayoutDashboard,
  MessagesSquare,
  Route,
  Search,
  Waypoints,
  GitCompareArrows,
  ShieldAlert,
  Activity,
  Luggage,
  ClipboardCheck,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { to: "/chat", labelKey: "nav.chat", icon: MessagesSquare },
  { to: "/plan", labelKey: "nav.planner", icon: Route },
  { to: "/search", labelKey: "nav.search", icon: Search },
  { to: "/itineraries", labelKey: "nav.itineraries", icon: Waypoints },
  { to: "/compare", labelKey: "nav.compare", icon: GitCompareArrows },
  { to: "/disruptions", labelKey: "nav.disruptions", icon: ShieldAlert },
  { to: "/simulator", labelKey: "nav.simulator", icon: Activity },
  { to: "/trips", labelKey: "nav.trips", icon: Luggage },
  { to: "/booking", labelKey: "nav.booking", icon: ClipboardCheck },
  { to: "/settings", labelKey: "nav.settings", icon: Settings },
];
