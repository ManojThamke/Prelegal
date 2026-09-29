"use client";

import type { ReactNode } from "react";

import type { NdaData, Party } from "@/lib/nda";

type Props = {
  data: NdaData;
  onChange: (data: NdaData) => void;
};

const baseInputClass =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm " +
  "focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";
const inputClass = `w-full ${baseInputClass}`;

export default function NdaForm({ data, onChange }: Props) {
  const set = <K extends keyof NdaData>(key: K, value: NdaData[K]) =>
    onChange({ ...data, [key]: value });

  const setParty = (key: "party1" | "party2", field: keyof Party, value: string) =>
    onChange({ ...data, [key]: { ...data[key], [field]: value } });

  return (
    <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
      <Section title="Agreement terms">
        <Field label="Purpose" hint="How Confidential Information may be used" required>
          <textarea
            className={inputClass}
            rows={3}
            value={data.purpose}
            onChange={(e) => set("purpose", e.target.value)}
          />
        </Field>

        <Field label="Effective Date" required>
          <input
            type="date"
            className={inputClass}
            value={data.effectiveDate}
            onChange={(e) => set("effectiveDate", e.target.value)}
          />
        </Field>

        <Fieldset legend="MNDA Term" hint="The length of this MNDA">
          <Choice
            name="mndaTermType"
            checked={data.mndaTermType === "expires"}
            onSelect={() => set("mndaTermType", "expires")}
          >
            Expires
            <YearsInput
              value={data.mndaTermYears}
              disabled={data.mndaTermType !== "expires"}
              onChange={(v) => set("mndaTermYears", v)}
              label="MNDA term in years"
            />
            from Effective Date
          </Choice>
          <Choice
            name="mndaTermType"
            checked={data.mndaTermType === "until-terminated"}
            onSelect={() => set("mndaTermType", "until-terminated")}
          >
            Continues until terminated
          </Choice>
        </Fieldset>

        <Fieldset legend="Term of Confidentiality" hint="How long Confidential Information is protected">
          <Choice
            name="confidentialityType"
            checked={data.confidentialityType === "years"}
            onSelect={() => set("confidentialityType", "years")}
          >
            <YearsInput
              value={data.confidentialityYears}
              disabled={data.confidentialityType !== "years"}
              onChange={(v) => set("confidentialityYears", v)}
              label="Term of confidentiality in years"
            />
            from Effective Date (trade secrets protected while they remain trade secrets)
          </Choice>
          <Choice
            name="confidentialityType"
            checked={data.confidentialityType === "perpetual"}
            onSelect={() => set("confidentialityType", "perpetual")}
          >
            In perpetuity
          </Choice>
        </Fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Governing Law" hint="State" required>
            <input
              className={inputClass}
              placeholder="Delaware"
              value={data.governingLaw}
              onChange={(e) => set("governingLaw", e.target.value)}
            />
          </Field>
          <Field label="Jurisdiction" hint="City or county and state" required>
            <input
              className={inputClass}
              placeholder="New Castle, DE"
              value={data.jurisdiction}
              onChange={(e) => set("jurisdiction", e.target.value)}
            />
          </Field>
        </div>

        <Field label="MNDA Modifications" hint="Optional changes to the Standard Terms">
          <textarea
            className={inputClass}
            rows={3}
            value={data.modifications}
            onChange={(e) => set("modifications", e.target.value)}
          />
        </Field>
      </Section>

      {(["party1", "party2"] as const).map((key, i) => (
        <Section key={key} title={`Party ${i + 1}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Print Name" required>
              <input
                className={inputClass}
                value={data[key].name}
                onChange={(e) => setParty(key, "name", e.target.value)}
              />
            </Field>
            <Field label="Title">
              <input
                className={inputClass}
                value={data[key].title}
                onChange={(e) => setParty(key, "title", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Company" required>
            <input
              className={inputClass}
              value={data[key].company}
              onChange={(e) => setParty(key, "company", e.target.value)}
            />
          </Field>
          <Field label="Notice Address" hint="Email or postal address" required>
            <input
              className={inputClass}
              value={data[key].noticeAddress}
              onChange={(e) => setParty(key, "noticeAddress", e.target.value)}
            />
          </Field>
        </Section>
      ))}
    </form>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="border-b border-slate-200 pb-2 text-base font-semibold text-slate-900">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field(props: { label: string; hint?: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <FieldLabel {...props} />
      {props.children}
    </label>
  );
}

function Fieldset({ legend, hint, children }: { legend: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1">
        <FieldLabel label={legend} hint={hint} required />
      </legend>
      {children}
    </fieldset>
  );
}

function FieldLabel({ label, hint, required }: { label: string; hint?: string; required?: boolean }) {
  return (
    <span className="block text-sm font-medium text-slate-700">
      {label}
      {required && <span className="text-rose-600"> *</span>}
      {hint && <span className="ml-2 font-normal text-slate-500">{hint}</span>}
    </span>
  );
}

function Choice(props: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
      <input
        type="radio"
        name={props.name}
        checked={props.checked}
        onChange={props.onSelect}
        className="accent-indigo-600"
      />
      {props.children}
    </label>
  );
}

function YearsInput(props: {
  value: string;
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="number"
        min={1}
        step={1}
        aria-label={props.label}
        className={`${baseInputClass} w-20 py-1`}
        value={props.value}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.value)}
      />
      year(s)
    </span>
  );
}
