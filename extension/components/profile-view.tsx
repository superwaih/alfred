import type { ReactNode } from "react";
import { emptyProfile, type EducationEntry, type Profile, type Stance, type WorkEntry } from "@shared/profile";
import { formatUrl } from "@shared/url";
import { useProfileEditor } from "@/hooks/use-profile-editor";
import { CvTray } from "./cv-tray";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { Button, Eyebrow, Select, stagger, TextArea, TextInput, ViewTitle } from "./ui";

export function uid() {
  return crypto.randomUUID();
}

export function ProfileView({ setupBanner }: { setupBanner?: ReactNode }) {
  const [profile, update] = useProfileEditor();

  if (!profile) return null;

  const p = profile.personal;
  const setPersonal = (patch: Partial<Profile["personal"]>) => update({ ...profile, personal: { ...p, ...patch } });
  const setLinks = (patch: Partial<Profile["links"]>) => update({ ...profile, links: { ...profile.links, ...patch } });
  const setPrefs = (patch: Partial<Profile["preferences"]>) => update({ ...profile, preferences: { ...profile.preferences, ...patch } });

  return (
    <div className="space-y-4 px-5 pt-6">
      <ViewTitle
        className="pb-3"
        eyebrow={<Eyebrow>Profile · saved as you type</Eyebrow>}
        title="Told once. Used everywhere."
        sub="Your profile stays in this browser. Alfred only sends the parts a task needs to the AI that runs it."
      />

      {setupBanner}
      <CvTray profile={profile} update={update} />

      <Section title="About you" open>
        <div className="grid grid-cols-2 gap-2">
          <TextInput label="First name" value={p.firstName} onChange={(e) => setPersonal({ firstName: e.target.value })} autoComplete="given-name" />
          <TextInput label="Last name" value={p.lastName} onChange={(e) => setPersonal({ lastName: e.target.value })} autoComplete="family-name" />
        </div>
        <TextInput label="Preferred name" value={p.preferredName} onChange={(e) => setPersonal({ preferredName: e.target.value })} hint="Optional. Used when a form asks what you go by." />
        <TextInput label="Email" type="email" value={p.email} onChange={(e) => setPersonal({ email: e.target.value })} autoComplete="email" />
        <TextInput label="Phone" type="tel" value={p.phone} onChange={(e) => setPersonal({ phone: e.target.value })} autoComplete="tel" hint="Include your country code, e.g. +234." />
        <TextInput label="Street address" value={p.address} onChange={(e) => setPersonal({ address: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <TextInput label="City" value={p.city} onChange={(e) => setPersonal({ city: e.target.value })} />
          <TextInput label="State or region" value={p.state} onChange={(e) => setPersonal({ state: e.target.value })} />
          <TextInput label="Country" value={p.country} onChange={(e) => setPersonal({ country: e.target.value })} />
          <TextInput label="Postal code" value={p.postalCode} onChange={(e) => setPersonal({ postalCode: e.target.value })} />
        </div>
        <TextInput label="Headline" value={profile.headline} onChange={(e) => update({ ...profile, headline: e.target.value })} hint="One line, e.g. “Product designer, payments and logistics”." />
        <TextArea label="Summary" value={profile.summary} onChange={(e) => update({ ...profile, summary: e.target.value })} rows={4} />
      </Section>

      <Section title="Links">
        {(
          [
            ["linkedin", "LinkedIn", "https://linkedin.com/in/…"],
            ["portfolio", "Portfolio", "https://"],
            ["github", "GitHub", "https://github.com/…"],
            ["website", "Website", "https://"],
          ] as const
        ).map(([key, label, placeholder]) => (
          <TextInput
            key={key}
            label={label}
            type="url"
            inputMode="url"
            spellCheck={false}
            value={profile.links[key]}
            placeholder={placeholder}
            onChange={(e) => setLinks({ [key]: e.target.value })}
            onBlur={(e) => setLinks({ [key]: formatUrl(e.target.value) })}
          />
        ))}
      </Section>

      <Section title={`Experience${profile.work.length ? ` · ${profile.work.length}` : ""}`}>
        {profile.work.map((entry, index) => (
          <WorkEditor
            key={entry.id}
            entry={entry}
            onChange={(next) => update({ ...profile, work: profile.work.map((w, i) => (i === index ? next : w)) })}
            onRemove={() => update({ ...profile, work: profile.work.filter((_, i) => i !== index) })}
          />
        ))}
        <Button
          size="sm"
          tone="quiet"
          icon={PlusIcon}
          onClick={() =>
            update({
              ...profile,
              work: [...profile.work, { id: uid(), title: "", company: "", location: "", start: "", end: "", current: false, highlights: [] }],
            })
          }
        >
          Add a role
        </Button>
      </Section>

      <Section title={`Education${profile.education.length ? ` · ${profile.education.length}` : ""}`}>
        {profile.education.map((entry, index) => (
          <EducationEditor
            key={entry.id}
            entry={entry}
            onChange={(next) => update({ ...profile, education: profile.education.map((e, i) => (i === index ? next : e)) })}
            onRemove={() => update({ ...profile, education: profile.education.filter((_, i) => i !== index) })}
          />
        ))}
        <Button
          size="sm"
          tone="quiet"
          icon={PlusIcon}
          onClick={() => update({ ...profile, education: [...profile.education, { id: uid(), school: "", degree: "", field: "", start: "", end: "" }] })}
        >
          Add education
        </Button>
      </Section>

      <Section title="Skills">
        <TextArea
          label="Skills"
          value={profile.skills.join(", ")}
          onChange={(e) => update({ ...profile, skills: e.target.value.split(",").map((skill) => skill.trimStart()).filter((skill, i, all) => skill || i === all.length - 1) })}
          rows={3}
          hint="Separate skills with commas."
        />
      </Section>

      <Section title="Questions with weight">
        <p className="text-[13px] leading-relaxed text-ink-soft">
          Alfred leaves these for you unless you give a standing answer here. Salary stays blank on purpose: forms that ask will
          be flagged for you every time.
        </p>
        <TextInput label="Notice period" value={profile.preferences.noticePeriod} onChange={(e) => setPrefs({ noticePeriod: e.target.value })} placeholder="e.g. 4 weeks" />
        <TextInput
          label="Salary expectation"
          value={profile.preferences.salaryExpectation}
          onChange={(e) => setPrefs({ salaryExpectation: e.target.value })}
          hint="Leave empty to be asked on every form (recommended: it differs by job)."
        />
        <StanceSelect label="Authorised to work where you’re applying?" value={profile.preferences.workAuthorization} onChange={(v) => setPrefs({ workAuthorization: v })} />
        <StanceSelect label="Need visa sponsorship?" value={profile.preferences.needsSponsorship} onChange={(v) => setPrefs({ needsSponsorship: v })} />
        <StanceSelect label="Willing to relocate?" value={profile.preferences.willingToRelocate} onChange={(v) => setPrefs({ willingToRelocate: v })} />
      </Section>

      <Section title={`Saved answers${profile.answers.length ? ` · ${profile.answers.length}` : ""}`}>
        <p className="text-[13px] text-ink-soft">
          Questions you answer again and again (“How did you hear about us?”). Alfred uses an answer when a form asks something
          worded much the same way.
        </p>
        {profile.answers.map((answer, index) => (
          <div key={answer.id} className="space-y-3 rounded-[var(--r-card)] bg-sunken p-3.5 ring-1 ring-line">
            <TextInput
              label="Question"
              value={answer.question}
              onChange={(e) => update({ ...profile, answers: profile.answers.map((a, i) => (i === index ? { ...a, question: e.target.value } : a)) })}
            />
            <TextArea
              label="Your answer"
              value={answer.answer}
              rows={3}
              onChange={(e) => update({ ...profile, answers: profile.answers.map((a, i) => (i === index ? { ...a, answer: e.target.value } : a)) })}
            />
            <Button size="sm" tone="danger" icon={TrashIcon} onClick={() => update({ ...profile, answers: profile.answers.filter((_, i) => i !== index) })}>
              Remove
            </Button>
          </div>
        ))}
        <Button size="sm" tone="quiet" icon={PlusIcon} onClick={() => update({ ...profile, answers: [...profile.answers, { id: uid(), question: "", answer: "" }] })}>
          Add a saved answer
        </Button>
      </Section>

      <Section title="Start over">
        <p className="text-[13px] text-ink-soft">Clears your profile from this browser. Your saved CV file is kept.</p>
        <Button
          size="sm"
          tone="danger"
          icon={TrashIcon}
          onClick={() => {
            if (window.confirm("Clear your whole profile from this browser? This can't be undone.")) update(emptyProfile());
          }}
        >
          Clear my profile
        </Button>
      </Section>
    </div>
  );
}

/** A collapsible tray. The plus turns into a cross when open. */
function Section({ title, open = false, children }: { title: string; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className={`rise group rounded-[var(--r-card)] bg-shell p-[var(--bezel)] ring-1 ring-shell-ring ${stagger(3)}`}>
      <summary className="flex cursor-pointer list-none items-center justify-between rounded-[var(--r-card)] px-4 py-3.5 text-[15px] font-semibold tracking-[-0.02em] transition-colors duration-300 group-open:rounded-b-none group-open:bg-core [&::-webkit-details-marker]:hidden">
        {title}
        <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full bg-field ring-1 ring-line transition-transform duration-500 ease-spring group-open:rotate-45">
          <PlusIcon className="h-3.5 w-3.5" />
        </span>
      </summary>
      <div className="space-y-4 rounded-b-[18px] bg-core px-4 pb-5 pt-1 shadow-core">{children}</div>
    </details>
  );
}

export function StanceSelect({ label, value, onChange }: { label: string; value: Stance; onChange: (value: Stance) => void }) {
  return (
    <Select label={label} value={value} onChange={(e) => onChange(e.target.value as Stance)}>
      <option value="ask">Ask me each time</option>
      <option value="yes">Yes</option>
      <option value="no">No</option>
    </Select>
  );
}

export function WorkEditor({ entry, onChange, onRemove }: { entry: WorkEntry; onChange: (entry: WorkEntry) => void; onRemove: () => void }) {
  const set = (patch: Partial<WorkEntry>) => onChange({ ...entry, ...patch });
  return (
    <div className="space-y-3 rounded-[var(--r-card)] bg-sunken p-3.5 ring-1 ring-line">
      <TextInput label="Title" value={entry.title} onChange={(e) => set({ title: e.target.value })} />
      <TextInput label="Company" value={entry.company} onChange={(e) => set({ company: e.target.value })} />
      <TextInput label="Location" value={entry.location} onChange={(e) => set({ location: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        <TextInput label="Start" value={entry.start} onChange={(e) => set({ start: e.target.value })} placeholder="2022-03" />
        <TextInput label="End" value={entry.current ? "" : entry.end} disabled={entry.current} onChange={(e) => set({ end: e.target.value })} placeholder={entry.current ? "Present" : "2024-08"} />
      </div>
      <label className="flex items-center gap-2.5 text-[13px] font-medium">
        <input type="checkbox" checked={entry.current} onChange={(e) => set({ current: e.target.checked, end: e.target.checked ? "" : entry.end })} className="accent-[var(--action)]" />I
        work here now
      </label>
      <TextArea
        label="What you did"
        value={entry.highlights.join("\n")}
        onChange={(e) => set({ highlights: e.target.value.split("\n") })}
        rows={5}
        hint="One achievement or responsibility per line."
      />
      <Button size="sm" tone="danger" icon={TrashIcon} onClick={onRemove}>
        Remove role
      </Button>
    </div>
  );
}

export function EducationEditor({ entry, onChange, onRemove }: { entry: EducationEntry; onChange: (entry: EducationEntry) => void; onRemove: () => void }) {
  const set = (patch: Partial<EducationEntry>) => onChange({ ...entry, ...patch });
  return (
    <div className="space-y-3 rounded-[var(--r-card)] bg-sunken p-3.5 ring-1 ring-line">
      <TextInput label="School" value={entry.school} onChange={(e) => set({ school: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        <TextInput label="Degree" value={entry.degree} onChange={(e) => set({ degree: e.target.value })} placeholder="B.Sc." />
        <TextInput label="Field" value={entry.field} onChange={(e) => set({ field: e.target.value })} />
        <TextInput label="Start" value={entry.start} onChange={(e) => set({ start: e.target.value })} placeholder="2014" />
        <TextInput label="End" value={entry.end} onChange={(e) => set({ end: e.target.value })} placeholder="2018" />
      </div>
      <Button size="sm" tone="danger" icon={TrashIcon} onClick={onRemove}>
        Remove
      </Button>
    </div>
  );
}

