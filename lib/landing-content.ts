// -----------------------------------------------------------------------------
// Landing-page content shape.
//
// TEMPORARY STAND-IN: `placeholderLanding` is the single place stand-in copy
// lives while Supabase is not yet wired (spec build order §17.3 precedes §17.4).
// In Chunk 6 (multi-tenancy / branding loader) this object is REPLACED by data
// resolved from `tenants` / `tenant_branding` / content tables for the current
// tenant slug — the section components below never change.
//
// Per project rule: no tenant-specific values are hardcoded in components, and
// the flagship tenant's real names appear ONLY in database seed files — never in
// app code. The sample brand below is a generic, obviously-fictional placeholder
// used purely to exercise the layout.
// -----------------------------------------------------------------------------

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
  event: {
    eyebrow: string;
    title: string;
    when: string;
    location: string;
    description: string;
    cta: CtaLink;
  };
  aiCoach: {
    eyebrow: string;
    title: string;
    description: string;
    sampleQuestion: string;
    sampleAnswer: string;
    disclaimer: string;
  };
  membership: {
    eyebrow: string;
    title: string;
    subtitle: string;
    plans: {
      name: string;
      price: string;
      cadence: string;
      description: string;
      features: string[];
      featured?: boolean;
      cta: string;
    }[];
  };
  proof: {
    eyebrow: string;
    title: string;
    testimonials: { quote: string; author: string; role: string }[];
  };
  footer: {
    tagline: string;
    platformNote: string;
    columns: { title: string; links: NavItem[] }[];
  };
}

// Generic, fictional placeholder tenant — NOT the flagship. Replaced by real
// tenant data in Chunk 6.
export const placeholderLanding: LandingContent = {
  tenant: {
    name: "Riverstone Collective",
    tagline: "A calm place to learn, reflect, and grow together."
  },
  nav: [
    { label: "Podcast", href: "#podcast" },
    { label: "Learning", href: "#learning" },
    { label: "Community", href: "#community" },
    { label: "Events", href: "#events" },
    { label: "Membership", href: "#membership" }
  ],
  hero: {
    eyebrow: "White-label community platform",
    title: "Turn your content into a",
    emphasis: "thriving learning community.",
    subtitle:
      "One branded home for your podcast, courses, community, events, and an AI Coach grounded only in your own teaching — no stitched-together tools.",
    primary: { label: "Join the community", href: "/join" },
    secondary: { label: "Explore the demo", href: "/demo" },
    nowPlaying: {
      label: "Now playing",
      episodeTitle: "The Quiet Hours — Ep. 42",
      duration: "38:12",
      coachNote:
        "“In episode 42 you spoke about boundaries in caregiving. Here are the three practices you recommended, with links to the full segments.”"
    }
  },
  featured: {
    episode: {
      eyebrow: "Featured episode",
      title: "The weight we don't name",
      description:
        "Why we carry so much in silence — and a simple first step toward saying it out loud.",
      meta: "38 min · Season 3",
      href: "/podcast"
    },
    course: {
      eyebrow: "Featured learning path",
      title: "Foundations of Reflection",
      description: "A six-lesson path from noticing what you feel to naming it with honesty.",
      meta: "6 lessons · Self-paced",
      href: "/learning"
    },
    resource: {
      eyebrow: "Featured resource",
      title: "The weekly reflection workbook",
      description: "A printable guide to pair with each episode and lesson.",
      meta: "PDF · Free for members",
      href: "/resources"
    }
  },
  community: {
    eyebrow: "Community",
    title: "You don't have to do this alone.",
    description:
      "Members share wins, questions, and encouragement in moderated circles — right next to the content, not on someone else's feed.",
    posts: [
      {
        initials: "DR",
        author: "Darius R.",
        meta: "Reflection Circle · 2h ago",
        body: "Week two of the workbook. Called my brother for the first time in a year. We talked for two hours."
      },
      {
        initials: "MT",
        author: "Maria T.",
        meta: "Wins · Yesterday",
        body: "Finished Foundations today. Six weeks ago I couldn't name what I was feeling. Thank you, everyone."
      }
    ]
  },
  event: {
    eyebrow: "Upcoming event",
    title: "Group reflection circle",
    when: "Thursday · 7:00 PM ET",
    location: "Live on Zoom · Members welcome",
    description: "A guided hour of shared reflection and gentle conversation. Replay posted for anyone who misses it.",
    cta: { label: "Reserve your seat", href: "/events" }
  },
  aiCoach: {
    eyebrow: "AI Coach",
    title: "Guidance in your voice, grounded in your work.",
    description:
      "Members can ask a question and get an answer drawn only from this community's episodes, lessons, and notes — with the sources cited every time.",
    sampleQuestion: "Where should I start if I'm new here?",
    sampleAnswer:
      "Most members begin with the Foundations path — it's the core of everything else. Lesson 1 is about 12 minutes.",
    disclaimer:
      "The AI Coach offers reflection and learning support, not licensed medical, legal, or crisis care."
  },
  membership: {
    eyebrow: "Membership",
    title: "Choose how you want to belong.",
    subtitle: "Start free. Upgrade any time. Cancel whenever you need to.",
    plans: [
      {
        name: "Community",
        price: "Free",
        cadence: "",
        description: "For getting started and finding your footing.",
        features: ["Community circles", "Latest podcast episodes", "Weekly reflection prompt"],
        cta: "Join free"
      },
      {
        name: "Growth",
        price: "$29",
        cadence: "/month",
        description: "For members ready to go deeper.",
        features: ["Everything in Community", "All courses & lessons", "Event replays", "AI Coach access"],
        featured: true,
        cta: "Start Growth"
      },
      {
        name: "Full Access",
        price: "$79",
        cadence: "/month",
        description: "For those who want personal guidance.",
        features: ["Everything in Growth", "Monthly live workshops", "Priority Q&A"],
        cta: "Go Full Access"
      }
    ]
  },
  proof: {
    eyebrow: "What members say",
    title: "A community that meets people where they are.",
    testimonials: [
      {
        quote: "It's the first place online that felt calm instead of loud. I actually look forward to logging in.",
        author: "Keisha P.",
        role: "Member since this spring"
      },
      {
        quote: "Having the podcast, the courses, and the group all in one place changed how much I actually finish.",
        author: "Samuel B.",
        role: "Growth member"
      },
      {
        quote: "The AI Coach pointed me back to the exact episode I needed. That still amazes me.",
        author: "Angela M.",
        role: "Full Access member"
      }
    ]
  },
  footer: {
    tagline: "A branded home for content, learning, community, and reflection.",
    platformNote: "Powered by Creator Community AI · a Nexx Jenn Technologies platform",
    columns: [
      {
        title: "Explore",
        links: [
          { label: "Podcast", href: "#podcast" },
          { label: "Learning", href: "#learning" },
          { label: "Community", href: "#community" }
        ]
      },
      {
        title: "Join",
        links: [
          { label: "Membership", href: "#membership" },
          { label: "Sign in", href: "/login" },
          { label: "Create account", href: "/join" }
        ]
      }
    ]
  }
};
