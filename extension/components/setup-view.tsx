import { ArrowRightIcon, BriefcaseIcon, GraduationCapIcon, LinkSimpleIcon, type Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { formatUrl } from "@shared/url";
import { resumeFileItem, sessionItem, setupItem } from "@/lib/storage";
import { useProfileEditor } from "@/hooks/use-profile-editor";
import { useStored } from "@/hooks/use-stored";
import { CvTray } from "./cv-tray";
import { Button, stagger, TextInput } from "./ui";

type Props = { onFinish: () => void };

/**
 * First-run setup on one screen: add the CV, glance at what Alfred found,
 * start applying. Everything else can be changed later in Profile.
 */
export function SetupView({ onFinish }: Props) {
  const [session] = useStored(sessionItem);
  const [file] = useStored(resumeFileItem);
  const [setup, setSetup] = useStored(setupItem);
  const [profile, update] = useProfileEditor();

  if (!profile || !setup || file === undefined) return null;

  const p = profile.personal;
  const hasCv = Boolean(file) || profile.resumeText.trim().length > 40;
  const ready = Boolean(p.firstName && p.email);
  const firstName = p.firstName || session?.user.name.split(" ")[0] || "";
  const links = [profile.links.linkedin, profile.links.github, profile.links.portfolio, profile.links.website].filter(Boolean);

  function finish(skipped: boolean) {
    void setSetup({ ...setup!, done: !skipped, skipped }).then(onFinish);
  }

  return (
    <div className="min-h-dvh space-y-6 px-6 pb-10 pt-8">
      <div className="rise space-y-2">
        <h1 className="serif text-[30px]">{hasCv ? `Here’s what we found${firstName ? `, ${firstName}` : ""}.` : "Add your CV"}</h1>
        <p className="text-[13px] leading-relaxed text-ink-soft">
          {hasCv ? "Check these, then you’re ready. Everything else lives in Profile." : "Alfred reads it to fill in your profile. It takes a few seconds."}
        </p>
      </div>

      <div className={`rise rounded-[12px] border border-[var(--shell-ring)] bg-core p-4 ${stagger(1)}`}>
        <CvTray bare profile={profile} update={update} />
      </div>

      {hasCv && (
        <section className={`rise space-y-5 rounded-[12px] border border-[var(--shell-ring)] bg-core p-4 ${stagger(2)}`} aria-label="Your details">
          <div className="grid grid-cols-2 gap-2.5">
            <TextInput label="First name" value={p.firstName} onChange={(e) => update((x) => ({ ...x, personal: { ...x.personal, firstName: e.target.value } }))} />
            <TextInput label="Last name" value={p.lastName} onChange={(e) => update((x) => ({ ...x, personal: { ...x.personal, lastName: e.target.value } }))} />
          </div>
          <TextInput label="Email" type="email" value={p.email} onChange={(e) => update((x) => ({ ...x, personal: { ...x.personal, email: e.target.value } }))} />
          <TextInput label="Phone" type="tel" value={p.phone} onChange={(e) => update((x) => ({ ...x, personal: { ...x.personal, phone: e.target.value } }))} />

          <dl className="space-y-2.5 border-t border-[var(--line)] pt-4 text-[13px]">
            <Row icon={LinkSimpleIcon} label="Links">
              {links.length ? links.map((link) => formatUrl(link).replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")).join(" · ") : "None found"}
            </Row>
            <Row icon={BriefcaseIcon} label="Experience">
              {profile.work.length
                ? profile.work
                    .slice(0, 3)
                    .map((w) => [w.title, w.company].filter(Boolean).join(", "))
                    .join(" · ") + (profile.work.length > 3 ? ` · +${profile.work.length - 3} more` : "")
                : "Not found yet"}
            </Row>
            <Row icon={GraduationCapIcon} label="Education">
              {profile.education.length ? profile.education.map((e) => e.school).filter(Boolean).join(" · ") : "None found"}
            </Row>
          </dl>
        </section>
      )}

      <div className={`rise space-y-3 ${stagger(3)}`}>
        {hasCv && (
          <Button size="lg" className="w-full" trailing={ArrowRightIcon} disabled={!ready} onClick={() => finish(false)}>
            Start applying
          </Button>
        )}
        {hasCv && !ready && <p className="text-center text-[12px] text-ink-soft">Add your first name and email to continue.</p>}
        <button type="button" onClick={() => finish(true)} className="mx-auto block text-[13px] font-medium text-ink-soft hover:text-ink">
          Skip for now
        </button>
      </div>
    </div>
  );
}

function Row({ icon: I, label, children }: { icon: Icon; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="flex w-24 shrink-0 items-center gap-1.5 text-ink-soft">
        <I aria-hidden className="h-4 w-4" />
        {label}
      </dt>
      <dd className="min-w-0 flex-1 break-words">{children}</dd>
    </div>
  );
}
