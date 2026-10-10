#!/usr/bin/env node
// The morning brief's sources, gathered on voyager into one compact Markdown digest for Familiar to write the brief
// from (README.md). Each source is fetched on its own with a time limit; one that fails says why in a line and the
// rest still print. Read-only: databases are copied before they are opened.
//
//   node ~/Repositories/scripts/brief/sources.mjs            # the digest, Markdown
//   node ~/Repositories/scripts/brief/sources.mjs --json     # the same, as JSON
import { execFile } from "node:child_process";
import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const HOME = homedir();
const PATH = `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH ?? ""}`;
const now = new Date();
const DAY = 86_400_000;

/** A source: a name and a function returning Markdown lines (or throwing). */
const sources = [
	["Weather", weather],
	["Calendar", calendar],
	["Things", things],
	["Yesterday's log", log],
	["Arc tabs", arcTabs],
	["Enchiridion", enchiridion],
	["Voyager", voyager],
];

const results = await Promise.all(
	sources.map(async ([name, fn]) => {
		const started = Date.now();
		try {
			const lines = await withTimeout(fn(), 25_000);
			return { name, ok: true, lines, ms: Date.now() - started };
		} catch (error) {
			return { name, ok: false, error: oneLine(error?.message ?? String(error)), ms: Date.now() - started };
		}
	}),
);

if (process.argv.includes("--json")) {
	console.log(JSON.stringify({ at: now.toISOString(), sources: results }, null, 2));
} else {
	const out = [`# Brief sources, ${fmtDay(now)} ${fmtTime(now)}`];
	for (const r of results) {
		out.push("", `## ${r.name}`);
		if (!r.ok) out.push(`(unavailable: ${r.error})`);
		else if (r.lines.length === 0) out.push("(nothing)");
		else out.push(...r.lines);
	}
	console.log(out.join("\n"));
}

// MARK: Sources

/** Chicago, from Open-Meteo (no key): today's high and low, rain chances by part of day, and tomorrow's line. */
async function weather() {
	const url = "https://api.open-meteo.com/v1/forecast?latitude=41.88&longitude=-87.63&timezone=America%2FChicago"
		+ "&temperature_unit=fahrenheit&precipitation_unit=inch&forecast_days=2"
		+ "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,sunset"
		+ "&hourly=precipitation_probability,temperature_2m";
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
	const w = await res.json();
	const d = w.daily;
	const line = (i) => `${d.time[i] === w.daily.time[0] ? "Today" : "Tomorrow"}: ${sky(d.weather_code[i])}, high ${Math.round(d.temperature_2m_max[i])}°F, low ${Math.round(d.temperature_2m_min[i])}°F, rain ${d.precipitation_probability_max[i]}%`;
	const parts = [["morning", 7, 12], ["afternoon", 12, 17], ["evening", 17, 22]].map(([name, a, b]) => {
		const hours = w.hourly.time.map((t, k) => [Number(t.slice(11, 13)), t.slice(0, 10), w.hourly.precipitation_probability[k]])
			.filter(([h, day]) => day === d.time[0] && h >= a && h < b).map((x) => x[2]);
		return `${name} ${Math.max(0, ...hours)}%`;
	});
	return [`- ${line(0)} (rain by part of day: ${parts.join(", ")}); sunset ${d.sunset[0].slice(11)}`, `- ${line(1)}`];
}

/** Events today and the next three days from the synced Calendar database (a copy), holidays once, by day. */
async function calendar() {
	const src = join(HOME, "Library/Group Containers/group.com.apple.calendar");
	const dir = await mkdtemp(join(tmpdir(), "brief-cal-"));
	try {
		for (const f of ["Calendar.sqlitedb", "Calendar.sqlitedb-wal", "Calendar.sqlitedb-shm"]) {
			await copyFile(join(src, f), join(dir, f)).catch(() => {});
		}
		const start = Math.floor(startOfDay(now).getTime() / 1000) - 978307200;
		const end = start + 4 * 86400;
		const sql = `select c.title, ci.summary, coalesce(o.occurrence_start_date, o.occurrence_date), o.occurrence_end_date,
			ci.all_day, coalesce(l.title, '') from OccurrenceCache o
			join CalendarItem ci on ci.ROWID = o.event_id join Calendar c on c.ROWID = ci.calendar_id
			left join Location l on l.ROWID = ci.location_id
			where coalesce(o.occurrence_start_date, o.occurrence_date) >= ${start} and coalesce(o.occurrence_start_date, o.occurrence_date) < ${end}
			and ci.status != 3 order by 3;`;
		const { stdout } = await run("sqlite3", ["-separator", "\t", join(dir, "Calendar.sqlitedb"), sql], { env: { PATH } });
		const seen = new Set();
		const byDay = new Map();
		for (const row of stdout.trim().split("\n").filter(Boolean)) {
			const [cal, title, startAt, endAt, allDay, place] = row.split("\t");
			const at = new Date((Number(startAt) + 978307200) * 1000);
			const key = `${title}|${at.toDateString()}${allDay === "1" ? "" : at.getTime()}`;
			if (seen.has(key)) continue;
			seen.add(key);
			const day = fmtDay(at);
			const holiday = /holiday/i.test(cal);
			const time = allDay === "1" ? "all day" : `${fmtTime(at)}${endAt ? `–${fmtTime(new Date((Number(endAt) + 978307200) * 1000))}` : ""}`;
			const text = `- ${time}: ${title}${place ? ` (at ${oneLine(place)})` : ""}${holiday ? " [holiday]" : ` [${cal}]`}`;
			if (!byDay.has(day)) byDay.set(day, []);
			byDay.get(day).push(text);
		}
		const lines = [];
		for (let k = 0; k < 4; k++) {
			const day = fmtDay(new Date(startOfDay(now).getTime() + k * DAY));
			const label = k === 0 ? `Today (${day})` : k === 1 ? `Tomorrow (${day})` : day;
			lines.push(`${label}:`, ...(byDay.get(day) ?? ["- nothing"]));
		}
		return lines;
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

/** Things, from its database through the `things` CLI: Today, deadlines in the next week, the inbox, done yesterday. */
async function things() {
	const list = async (...args) => JSON.parse((await run("things", [...args, "--json"], { env: { PATH, HOME } })).stdout || "[]");
	const [today, upcoming, inbox, logbook] = await Promise.all([list("today"), list("upcoming"), list("inbox"), list("logbook")]);
	const title = (t) => `${t.title}${t.project_title ? ` (${t.project_title})` : t.area_title ? ` (${t.area_title})` : ""}${t.deadline ? `, due ${t.deadline}` : ""}`;
	const week = isoDay(new Date(now.getTime() + 7 * DAY));
	const due = [...today, ...upcoming].filter((t) => t.deadline && t.deadline <= week);
	const soon = upcoming.filter((t) => t.start_date && t.start_date <= isoDay(new Date(now.getTime() + 3 * DAY)));
	const yesterday = isoDay(new Date(now.getTime() - DAY));
	const done = logbook.filter((t) => (t.stop_date ?? t.modified ?? "").startsWith(yesterday));
	const old = (t) => Math.round((now - new Date(t.created)) / DAY);
	return [
		`- Today (${today.length}): ${today.map(title).join("; ") || "nothing"}`,
		`- Deadlines within a week: ${[...new Map(due.map((t) => [t.uuid, t])).values()].map(title).join("; ") || "none"}`,
		`- Starting in the next 3 days: ${soon.map((t) => `${t.title} (${t.start_date})`).join("; ") || "none"}`,
		`- Inbox: ${inbox.length} item${inbox.length === 1 ? "" : "s"}${inbox.length ? `, oldest ${Math.max(...inbox.map(old))} days` : ""}`,
		`- Completed yesterday: ${done.map((t) => t.title).join("; ") || "none"}`,
	];
}

/** Yesterday's section of ~/Notes/Log.md (headings like "## Friday, October 9"), and today's if it has begun. */
async function log() {
	const text = await readFile(join(HOME, "Notes/Log.md"), "utf8");
	const heading = (d) => `## ${d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`;
	const section = (d) => {
		const lines = text.split("\n");
		const i = lines.findIndex((l) => l.trim() === heading(d));
		if (i < 0) return [];
		const out = [];
		for (const l of lines.slice(i + 1)) {
			if (l.startsWith("## ")) break;
			if (l.trim()) out.push(l.length > 300 ? `${l.slice(0, 300)}…` : l);
		}
		return out;
	};
	const yesterday = section(new Date(now.getTime() - DAY));
	const today = section(now);
	const last = text.split("\n").find((l) => l.startsWith("## "));
	const lines = yesterday.length ? yesterday : [`- (no entries yesterday; the latest heading is "${last?.slice(3) ?? "none"}")`];
	return today.length ? [...lines, "Today so far:", ...today] : lines;
}

/** Arc's synced sidebar, from the arc-tabs service: how many tabs are open, per space, and the newest few. */
async function arcTabs() {
	const res = await fetch("http://localhost:5003/api/tabs?view=open");
	if (!res.ok) throw new Error(`arc-tabs ${res.status}`);
	const body = await res.json();
	const tabs = Array.isArray(body) ? body : body.tabs ?? [];
	const bySpace = new Map();
	for (const t of tabs) bySpace.set(t.space ?? t.spaceTitle ?? "?", (bySpace.get(t.space ?? t.spaceTitle ?? "?") ?? 0) + 1);
	const stamp = (t) => Date.parse(t.lastActiveAt ?? t.createdAt ?? t.updatedAt ?? "") || 0;
	const newest = [...tabs].sort((a, b) => stamp(b) - stamp(a)).slice(0, 5);
	const stale = tabs.filter((t) => stamp(t) && now - stamp(t) > 7 * DAY).length;
	return [
		`- ${tabs.length} open tabs (${[...bySpace].map(([s, n]) => `${s} ${n}`).join(", ")})${stale ? `; ${stale} untouched for over a week` : ""}`,
		...newest.map((t) => `- newest: ${oneLine(t.title ?? t.url ?? "?").slice(0, 90)}`),
	];
}

/** Records added to Enchiridion in the last day. */
async function enchiridion() {
	const bin = join(HOME, "Repositories/enchiridion/backend/cli/ench/bin.js");
	const { stdout } = await run("node", [bin, "records", "list", "--full", "--order=recordCreatedAt:desc", "--limit=15"], {
		env: { PATH, HOME },
		cwd: join(HOME, "Repositories/enchiridion"),
	});
	const records = JSON.parse(stdout).data ?? [];
	const recent = records.filter((r) => now - Date.parse(r.recordCreatedAt ?? r.createdAt ?? 0) < DAY);
	return recent.length
		? recent.map((r) => `- ${r.type ?? "record"}: ${oneLine(r.title ?? r.url ?? `#${r.id}`).slice(0, 100)}`)
		: ["- nothing added in the last day"];
}

/** The server: pm2 apps that aren't online or restarted lately, and free disk. */
async function voyager() {
	const { stdout } = await run("pm2", ["jlist"], { env: { PATH, HOME } });
	const apps = JSON.parse(stdout);
	const down = apps.filter((a) => a.pm2_env?.status !== "online").map((a) => `${a.name} (${a.pm2_env?.status})`);
	const restarted = apps.filter((a) => a.pm2_env?.status === "online" && now - a.pm2_env.pm_uptime < DAY && a.name !== "familiar")
		.map((a) => a.name);
	const df = (await run("df", ["-h", HOME], { env: { PATH } })).stdout.trim().split("\n").at(-1).split(/\s+/);
	return [
		`- pm2: ${apps.length} apps, ${down.length ? `down: ${down.join(", ")}` : "all online"}${restarted.length ? `; restarted in the last day: ${restarted.join(", ")}` : ""}`,
		`- disk: ${df[3]} free of ${df[1]} (${df[4]} used)`,
	];
}

// MARK: Helpers

function withTimeout(promise, ms) {
	let timer;
	const limit = new Promise((_, reject) => {
		timer = setTimeout(() => reject(new Error(`timed out after ${ms / 1000} s`)), ms);
	});
	return Promise.race([promise, limit]).finally(() => clearTimeout(timer));
}

function startOfDay(d) {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isoDay(d) {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDay(d) {
	return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function fmtTime(d) {
	return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function oneLine(s) {
	return String(s).replace(/\s+/g, " ").trim();
}

function sky(code) {
	if (code === 0) return "clear";
	if (code <= 3) return "partly cloudy";
	if (code <= 48) return "fog";
	if (code <= 67) return "rain";
	if (code <= 77) return "snow";
	if (code <= 82) return "showers";
	return "thunderstorms";
}
