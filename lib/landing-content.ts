export interface CtaLink {
  label: string;
  href: string;
}

export interface NavItem {
  label: string;
  href: string;
}

export interface LandingContent {
  tenant: { name: string; tagline: string };
  nav: NavItem[];
  hero: {
    eyebrow: string;
    title: string;
    emphasis: string;
    subtitle: string;
    primary: CtaLink;
    secondary: CtaLink;
    nowPlaying: { label: string; episodeTitle: string; duration: string; coachNote: string };
  };
  featured: {
    episode: { eyebrow: string; title: string; description: string; meta: string; href: string };
    course: { eyebrow: string; title: string; description: string; meta: string; href: string };
    resource: { eyebrow: string; title: string; description: string; meta: string; href: string };
  };
  community: {
    eyebrow: string;
    title: string;
    description: string;
    posts: { initials: string; author: string; meta: string; body: string }[];
  };
  event: { eyebrow: string; title: string; when: string; location: string; description: string; cta: CtaLink };
  aiCoach: { eyebrow: string; title: string; description: string; question: string; answer: string; disclaimer: string };
  membership: {
    eyebrow: string;
    title: string;
    subtitle: string;
    plans: { name: string; price: string; cadence: string; description: string; features: string[]; featured?: boolean; cta: string }[];
  };
  proof: { eyebrow: string; title: string; testimonials: { quote: string; author: string; role: string }[] };
  footer: { tagline: string; platformNote: string; columns: { title: string; links: NavItem[] }[] };
}
