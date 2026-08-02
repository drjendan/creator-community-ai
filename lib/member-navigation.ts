export type MemberNavigationItem = {
  label: "Welcome" | "Content Library" | "Community";
  href?: string;
  children?: Array<{ label: "Discussions" | "Messages"; href: string }>;
};

export function memberNavigation(base: string): MemberNavigationItem[] {
  return [
    { label: "Welcome", href: `${base}/welcome` },
    { label: "Content Library", href: `${base}/library` },
    {
      label: "Community",
      children: [
        { label: "Discussions", href: `${base}/community` },
        { label: "Messages", href: `${base}/messages` }
      ]
    }
  ];
}
