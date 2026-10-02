import { Bookmark, Calendar, ExternalLink, GitHub, Globe, Heart, Home, Link, Mail, Star, User, type Icon } from "react-feather";

const FEATHER_ICONS: Record<string, Icon> = {
  bookmark: Bookmark,
  calendar: Calendar,
  "external-link": ExternalLink,
  github: GitHub,
  globe: Globe,
  heart: Heart,
  home: Home,
  link: Link,
  mail: Mail,
  star: Star,
  user: User,
};

export const FEATHER_ICON_NAMES = Object.keys(FEATHER_ICONS);

export function isFeatherIconName(value: string | undefined): boolean {
  return !value || value.trim().toLocaleLowerCase() in FEATHER_ICONS;
}

export function FeatherActionIcon({ name, size = 18 }: { name?: string; size?: number }) {
  const IconComponent = FEATHER_ICONS[name?.trim().toLocaleLowerCase() ?? ""] ?? Link;
  return <IconComponent size={size} aria-hidden="true" />;
}
