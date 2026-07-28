import { BrandMark } from "@/components/BrandMark";
import { DemoRequestForm } from "@/components/forms/DemoRequestForm";
import { Card, Container } from "@/components/ui";
export default function RequestDemoPage() { return <main className="min-h-screen bg-brand-50 py-10"><Container><BrandMark /><div className="mx-auto mt-12 grid max-w-4xl gap-10 lg:grid-cols-2 lg:items-center"><div><p className="text-xs font-bold uppercase tracking-wide text-accent-700">See UpNexx in action</p><h1 className="mt-4 font-display text-4xl font-extrabold text-brand-900">Let’s build the next home for your audience.</h1><p className="mt-5 leading-7 text-brand-600">Tell us about your content and community. We’ll show you how UpNexx can support your branded member experience.</p><p className="mt-6 text-sm font-semibold text-brand-500">Powered by Nexx Jenn Technologies</p></div><Card><DemoRequestForm /></Card></div></Container></main>; }

