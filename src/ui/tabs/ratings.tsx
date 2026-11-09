"use client";

import { maxOf } from "@/core/analysis/grid";
import { useTranslations } from "next-intl";
import type { SessionAnalysis } from "@/core/analysis";
import { catalogue } from "@/core/model/catalogue";
import { RatingCard, useLevelWord } from "../bits";
import { num } from "../format";
import { useStore } from "../store";

const v = <T,>(r: { available: true; value: T } | { available: false }): T | null => (r.available ? r.value : null);

export function LinkCard({ a }: { a: SessionAnalysis }) {
  const t = useTranslations("rating");
  const word = useLevelWord();
  const loc = useStore().settings.locale;
  const l = v(a.link);
  const o = l?.overall;
  const hint = o ? t("linkHint") + (o.worst < o.level ? " " + t("linkBriefly", { level: word("link", o.worst).toLowerCase() }) : "") : "";
  const fades = Object.entries(l?.fades ?? {}).filter(([, n]) => n !== undefined);
  return (
    <RatingCard name={t("link")} level={o?.level ?? null} word={word("link", o?.level ?? null)} hint={hint}
      rows={l ? [
        [t("frameLosses"), l.frameLosses ?? "–"],
        [t("frameLossesPerMin"), num(loc, l.frameLossesPerMinute, 0)],
        [t("holds"), l.holdsAirborne ?? "–"],
        ...fades.map(([k, n]): [string, string] => [t("fades", { antenna: k.toUpperCase() }), `${n}${(n ?? 0) > 500 ? " · " + t("moveAntenna") : ""}`]),
        [t("weakTime"), `${num(loc, (o?.weakShare ?? 0) * 100, 0)} %`],
        [t("levels"), t("levelsLink")],
      ] : null} />
  );
}

export function SignalCard({ a }: { a: SessionAnalysis }) {
  const t = useTranslations("rating");
  const word = useLevelWord();
  const loc = useStore().settings.locale;
  const s = v(a.signal);
  const o = s?.overall;
  const hint = t("signalHint") + (o && o.weakShare > 0.05 ? " " + t("signalWeakShare", { pct: num(loc, o.weakShare * 100, 0) }) : "");
  return (
    <RatingCard name={t("signal")} level={o?.level ?? null} word={word("signal", o?.level ?? null)} hint={s ? hint : ""}
      rows={s ? [[t("typical"), `${num(loc, s.medianDbm, 0)} dBm`], [t("weakest"), `${num(loc, s.minDbm, 0)} dBm`], [t("levels"), t("levelsSignal")]] : null} />
  );
}

export function UsedCard({ a }: { a: SessionAnalysis }) {
  const t = useTranslations("rating");
  const word = useLevelWord();
  const loc = useStore().settings.locale;
  const u = v(a.batteryUse);
  const c = v(a.charge);
  const hint = !u ? "" : u.capacityMah
    ? t("usedHint", { used: num(loc, u.usedMah, 0), capacity: u.capacityMah, assumed: u.capacityAssumed ? t("assumed") : "" })
    : t("usedNoCapacity", { used: num(loc, u.usedMah, 0) });
  return (
    <RatingCard name={t("used")} level={u?.level ?? null} word={word("used", u?.level ?? null)} hint={hint}
      rows={u ? [[t("usedByMotor"), `${num(loc, u.usedMah, 0)} mAh`], [t("cellStart"), `${num(loc, c?.startCellV, 2)} V`], [t("cellEnd"), `${num(loc, c?.endCellV, 2)} V`]] : null} />
  );
}

export function ConditionCard({ a }: { a: SessionAnalysis }) {
  const t = useTranslations("rating");
  const word = useLevelWord();
  const loc = useStore().settings.locale;
  const b = v(a.batteryCondition);
  const frozen = a.issues.some((i) => i.kind === "frozen");
  return (
    <RatingCard name={t("condition")} level={b?.level ?? null} word={word("condition", b?.level ?? null)}
      hint={b ? t("conditionHint") : frozen ? t("conditionFrozen") : t("conditionNone")}
      rows={b ? [
        [t("dropAt20"), `${num(loc, b.dropAt20A, 2)} V`],
        [t("resistance"), `${num(loc, b.resistancePerCellMilliOhm, 1)} mΩ`],
        [t("lowestLoaded"), `${num(loc, b.lowestLoadedV, 2)} V`],
        [t("levels"), t("levelsCondition")],
      ] : null} />
  );
}

export function TempCard({ a }: { a: SessionAnalysis }) {
  const t = useTranslations("rating");
  const word = useLevelWord();
  const loc = useStore().settings.locale;
  const x = v(a.temperatures);
  return (
    <RatingCard name={t("temps")} level={x?.level ?? null} word={word("temp", x?.level ?? null)} hint={x ? t("tempsHint") : ""}
      rows={x ? [[t("escMax"), `${num(loc, x.escMaxC, 0)} °C`], [t("becMax"), `${num(loc, x.becMaxC, 0)} °C`], [t("battMax"), `${num(loc, x.batteryMaxC, 0)} °C`]] : null} />
  );
}

export function RxCard({ a }: { a: SessionAnalysis }) {
  const t = useTranslations("rating");
  const word = useLevelWord();
  const loc = useStore().settings.locale;
  const x = v(a.receiverPower);
  return (
    <RatingCard name={t("rx")} level={x?.level ?? null} word={x?.holdInAir ? t("rxHold") : word("rx", x?.level ?? null)} hint={x ? t("rxHint") : ""}
      rows={x ? [[t("rxMin"), `${num(loc, x.rxMinV, 2)} V`], [t("becMin"), `${num(loc, x.becMinV, 2)} V`]] : null} />
  );
}

export function StyleCard({ a }: { a: SessionAnalysis }) {
  const t = useTranslations();
  const loc = useStore().settings.locale;
  const x = v(a.loads);
  const level = x ? ({ gentle: 1, moderate: 2, sporty: 3, hard: 4 } as const)[x.style] : null;
  return (
    <RatingCard name={t("rating.style")} level={level} neutral word={x ? t(`levels.style.${x.style}`) : ""} hint={x ? t("rating.styleHint") : ""}
      rows={x ? [[t("rating.maxLoad"), `${num(loc, x.maxG, 1)} g`], [t("rating.fastestRotation"), `${num(loc, x.maxRotation, 0)} °/s`]] : null} />
  );
}

export function DataCard({ a }: { a: SessionAnalysis }) {
  const t = useTranslations();
  const level = a.issues.length ? (Math.min(...a.issues.map((i) => i.level)) as 1 | 2) : 4;
  const word = a.issues.length === 1 ? t(`issue.${a.issues[0].kind}`) : a.issues.length ? t("rating.problems", { n: a.issues.length }) : t("rating.dataOk");
  return <RatingCard name={t("rating.data")} level={level} word={word} hint={a.issues.length ? t("rating.dataBad") : t("rating.dataOkHint")} />;
}

export function EfficiencyCard({ a }: { a: SessionAnalysis }) {
  const t = useTranslations("rating");
  const word = useLevelWord();
  const { settings } = useStore();
  const p = v(a.profile);
  const e = a.efficiency;
  return (
    <RatingCard name={t("efficiency")} level={e?.level ?? null} word={word("efficiency", e?.level ?? null)} hint={e ? t("efficiencyHint") : ""}
      rows={e && p ? [[t("thisFlight"), t("mPer100", { v: num(settings.locale, p.mPer100mAh, 0) })], [t("yourUsual"), t("mPer100", { v: num(settings.locale, a.baseline?.efficiency, 0) })]] : null} />
  );
}

export function ConsumptionCard({ a }: { a: SessionAnalysis }) {
  const t = useTranslations("rating");
  const word = useLevelWord();
  const { settings } = useStore();
  const p = v(a.profile);
  const c = a.consumption;
  return (
    <RatingCard name={t("consumption")} level={c?.level ?? null} word={word("consumption", c?.level ?? null)} hint={c ? t("consumptionHint") : ""}
      rows={c && p ? [[t("thisFlight"), t("mahPerMin", { v: num(settings.locale, p.mahPerMin, 0) })], [t("yourUsual"), t("mahPerMin", { v: num(settings.locale, a.baseline?.mahPerMin, 0) })]] : null} />
  );
}

export function IssueAlerts({ a }: { a: SessionAnalysis }) {
  const t = useTranslations();
  const loc = useStore().settings.locale;
  const maxA = a.grid.has("motor_current") ? Math.max(0, maxOf(a.grid.get("motor_current", "max")) ?? 0) : 0;
  return (
    <>
      {a.issues.map((i) => (
        <div key={i.kind} className="alert" style={{ borderColor: i.level === 1 ? "var(--crit)" : "var(--warn)" }}>
          <span className="ic" style={{ background: i.level === 1 ? "var(--crit)" : "var(--warn)" }}>!</span>
          <div>
            <b>{t(`issue.${i.kind}`)}</b>
            <span className="hint">
              {i.kind === "frozen"
                ? t("issue.frozenText", { amps: num(loc, maxA, 1), values: Object.entries(i.values).map(([id, val]) => `${catalogue(id)?.label[loc] ?? id} ${num(loc, val, 3)} V`).join(", ") })
                : t(`issue.${i.kind}Text`)}
            </span>
          </div>
        </div>
      ))}
    </>
  );
}
