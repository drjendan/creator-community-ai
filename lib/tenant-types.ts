export interface Tenant {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  primaryColor: string;
  secondaryColor?: string;
  accentColor: string;
  backgroundColor?: string;
  textColor?: string;
  buttonColor?: string;
  linkColor?: string;
  communicationEnabled?: boolean;
  enabledFeatures?: string[];
  logoUrl?: string;
  heroImageUrl?: string;
  emailLogoUrl?: string;
  faviconUrl?: string;
  emailFooterText?: string;
  dashboardGreeting?: string;
  welcomeHeadline?: string;
  welcomeMessage?: string;
  supportEmail?: string;
  podcastName?: string;
}
