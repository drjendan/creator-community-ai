"use client";

import { useState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { demoRequestSchema } from "@/lib/validation";

export function DemoRequestForm() {
  const [message, setMessage] = useState("");
  return (
    <form className="space-y-4" onSubmit={(event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget));
      const result = demoRequestSchema.safeParse(data);
      setMessage(result.success ? "Thanks. This mock form is ready to connect to your CRM or email workflow." : result.error.issues[0].message);
    }}>
      <Field label="Name" htmlFor="name"><Input id="name" name="name" /></Field>
      <Field label="Work email" htmlFor="email"><Input id="email" name="email" type="email" /></Field>
      <Field label="Organization" htmlFor="organization"><Input id="organization" name="organization" /></Field>
      <Field label="Current audience size" htmlFor="audienceSize"><Input id="audienceSize" name="audienceSize" type="number" min="0" /></Field>
      <Button type="submit" className="w-full">Request a Demo</Button>
      {message && <p role="status" className="rounded-lg bg-brand-50 p-3 text-sm text-brand-700">{message}</p>}
    </form>
  );
}
