"""Export the sample log as compact JSON for the HTML prototype.

Prototype-only helper: 1-second bins per session, plus a per-sensor inventory.
The real app will do this in the TypeScript decoder.
Usage: python3 -I prototype/export_data.py samples/Easy_Glider_4.TLM > prototype/data.js
"""
import json
import math
import struct
import sys
from collections import Counter, defaultdict
from datetime import datetime
from zoneinfo import ZoneInfo

BERLIN = ZoneInfo("Europe/Berlin")
HDR = b"\xff\xff\xff\xff"


def be16(p, o, s=False):
    return struct.unpack_from(">h" if s else ">H", p, o)[0]


def le16(p, o):
    return struct.unpack_from("<H", p, o)[0]


def i8(p, o):
    return struct.unpack_from("b", p, o)[0]


def read_sessions(path):
    d = open(path, "rb").read()
    out, cur, inh, i = [], None, False, 0
    while i + 4 <= len(d):
        if d[i:i + 4] == HDR:
            if not inh:
                cur = {"offset": i, "headers": [], "recs": []}
                out.append(cur)
                inh = True
            cur["headers"].append(d[i + 4:i + 36])
            i += 36
            continue
        if i + 20 > len(d):
            break
        inh = False
        cur["recs"].append((struct.unpack_from("<I", d, i)[0], d[i + 4:i + 20]))
        i += 20
    return out, len(d)


def stream_key(p):
    sid = p[0]
    if sid == 0x42:
        return "42/%02x" % (p[2] & 0xF0)
    return "%02x" % sid


def decode(p):
    """Return dict of field -> value (None = no data) for inventory stats."""
    sid = p[0]
    if sid == 0x20:
        rpm, vin, tf, im, tb = (be16(p, o) for o in (2, 4, 6, 8, 10))
        n16 = lambda v, s: None if v == 0xFFFF else v * s
        n8 = lambda v, s: None if v == 0xFF else v * s
        return {"Motor speed (electrical)": (n16(rpm, 10), "rpm"), "Input voltage": (n16(vin, .01), "V"),
                "Controller temp": (n16(tf, .1), "°C"), "Motor current": (n16(im, .01), "A"),
                "BEC temp": (n16(tb, .1), "°C"), "BEC current": (n8(p[12], .1), "A"),
                "BEC voltage": (n8(p[13], .05), "V"), "Throttle": (n8(p[14], .5), "%"),
                "Power output": (n8(p[15], .5), "%")}
    if sid == 0x40:
        v = [be16(p, o, True) / 10 for o in range(2, 16, 2)]
        names = ["Altitude", "Climb 0.25 s", "Climb 0.5 s", "Climb 1.0 s", "Climb 1.5 s", "Climb 2.0 s", "Climb 3.0 s"]
        return {n: (x, "m" if k == 0 else "m/s") for k, (n, x) in enumerate(zip(names, v))}
    if sid == 0x7F:
        v = [be16(p, o) for o in range(2, 16, 2)]
        names = ["Fades A", "Fades B", "Fades L", "Fades R", "Frame losses", "Holds"]
        r = {n: (None if x == 0xFFFF else x, "count") for n, x in zip(names, v)}
        r["Receiver voltage"] = (None if v[6] == 0xFFFF else v[6] / 100, "V")
        return r
    if sid == 0x7E:
        a, b = i8(p, 8), i8(p, 9)
        return {"Signal": (a if a < -1 else None, "dBm"), "Signal %": (b if b > 0 else None, "%"),
                "Pulse time": (None if be16(p, 2) == 0xFFFF else be16(p, 2), "µs"),
                "Voltage": (None if be16(p, 4) == 0xFFFF else be16(p, 4) / 100, "V"),
                "Temperature": (None if be16(p, 6) == 0x7FFF else be16(p, 6, True), "°F"),
                "Unknown counter @14 (≈ +1/s)": (be16(p, 14), "?")}
    if sid == 0x14:
        v = [be16(p, o, True) / 100 for o in range(2, 16, 2)]
        names = ["G x", "G y", "G z", "Max g x", "Max g y", "Max g z", "Min g z"]
        return {n: (x, "g") for n, x in zip(names, v)}
    if sid == 0x1A:
        v = [be16(p, o, True) / 10 for o in range(2, 14, 2)]
        names = ["Rate x", "Rate y", "Rate z", "Max rate x", "Max rate y", "Max rate z"]
        return {n: (x, "°/s") for n, x in zip(names, v)}
    if sid == 0x05:
        return {"Flight mode index (unverified)": (p[2], "")}
    if sid == 0x7C:
        return {"Start time (Unix)": (struct.unpack_from("<I", p, 8)[0], "s")}
    if sid == 0x42:
        t = p[2] & 0xF0
        if t == 0x00:
            vmin, vmax = le16(p, 10), le16(p, 12)
            cur = struct.unpack_from("<I", p, 4)[0]
            return {"Battery temp": (None if not any(p[3:]) else i8(p, 3), "°C"),
                    "Current (unreliable)": (None if cur == 0xFFFFFFFF else cur / 1000, "A"),
                    "Used (unreliable)": (None if le16(p, 8) == 0xFFFF else le16(p, 8), "mAh"),
                    "Lowest cell": (vmin / 1000 if vmin else None, "V"),
                    "Highest cell": (vmax / 1000 if vmax else None, "V")}
        if t == 0x10:
            cells = [le16(p, 4 + 2 * k) for k in range(6)]
            r = {"Cell %d" % (k + 1): (c / 1000 if c not in (0, 0xFFFF) else None, "V") for k, c in enumerate(cells)}
            r["Battery temp"] = (i8(p, 3) if any(c not in (0, 0xFFFF) for c in cells) else None, "°C")
            return r
        if t == 0x80:
            ok = any(p[8:])
            return {"Chemistry (1 = LiPo)": (p[3] if ok else None, ""), "Cells": (p[4] if ok else None, ""),
                    "Charge cycles": (le16(p, 6) if ok else None, "")}
        if t == 0x90:
            ok = any(p[4:])
            return {"Capacity": (le16(p, 4) if ok else None, "mAh"),
                    "Discharge rating (0.1 C?)": (le16(p, 6) / 10 if ok else None, "C"),
                    "Empty (hard limit)": (le16(p, 8) / 1000 if ok else None, "V"),
                    "Empty (0 % charge)": (le16(p, 10) / 1000 if ok else None, "V"),
                    "Full": (le16(p, 12) / 1000 if ok else None, "V"),
                    "Min temp": (i8(p, 14) if ok else None, "°C"), "Max temp": (i8(p, 15) if ok else None, "°C")}
    return {}


STREAMS = {
    "40": ("Vario", "Altitude and climb", "known"),
    "20": ("ESC (Avian 45A)", "Motor, controller and BEC", "known"),
    "7f": ("Link log", "Fades, frame losses, holds, receiver voltage", "known"),
    "7e": ("Signal", "Signal strength (dBm, %)", "partial"),
    "14": ("G-meter", "Accelerations", "known"),
    "1a": ("Gyro", "Rotation rates", "known"),
    "05": ("Flight controller", "Flight mode, unknown pages", "partial"),
    "42/00": ("Smart battery · live", "Temperature, cell min/max", "partial"),
    "42/10": ("Smart battery · cells", "Cells 1–6", "known"),
    "42/80": ("Smart battery · identity", "Chemistry, cells, cycles, ID", "known"),
    "42/90": ("Smart battery · limits", "Capacity, voltage limits", "known"),
    "0c": ("Text", "ESC programming-menu text", "known"),
    "7c": ("Clock", "Wall-clock start time", "partial"),
    "00": ("Empty slot", "No data (some carry fragments)", "unknown"),
    "76": ("Unknown 0x76", "Not understood", "unknown"),
}


def inventory(recs, dur):
    by = defaultdict(list)
    for t, p in recs:
        by[stream_key(p)].append((t, p))
    out = []
    for k, items in sorted(by.items(), key=lambda kv: -len(kv[1])):
        fields = defaultdict(lambda: {"n": 0, "nd": 0, "min": None, "max": None, "unit": ""})
        nodata = 0
        for _, p in items:
            dec = decode(p)
            if not any(v is not None for v, _ in dec.values()):
                nodata += 1
            for name, (v, unit) in dec.items():
                f = fields[name]
                f["unit"] = unit
                f["n"] += 1
                if v is None:
                    f["nd"] += 1
                else:
                    f["min"] = v if f["min"] is None else min(f["min"], v)
                    f["max"] = v if f["max"] is None else max(f["max"], v)
        uniq = Counter(p for _, p in items).most_common(6)
        name, desc, level = STREAMS.get(k, ("Unknown 0x" + k, "Not understood", "unknown"))
        out.append({
            "key": k, "name": name, "desc": desc, "level": level, "count": len(items),
            "rate": round(len(items) / dur, 2) if dur > 0 else None,
            "noData": round(nodata / len(items), 3),
            "fields": [{"name": n, "unit": f["unit"], "min": rnd(f["min"]), "max": rnd(f["max"]),
                        "noData": round(f["nd"] / f["n"], 3)} for n, f in fields.items()],
            "samples": [{"hex": p.hex(" "), "count": c} for p, c in uniq],
        })
    return out


def rnd(v, n=2):
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return None
    return round(v, n)


def series(recs):
    t0 = recs[0][0]
    nb = (recs[-1][0] - t0) // 100 + 1
    acc = [defaultdict(list) for _ in range(nb)]
    last = {}
    inc = defaultdict(float)

    def counter(key, v, b):
        if v is None:
            return
        if key in last:
            d = v - last[key]
            acc[b][key].append(d if d >= 0 else v)
        last[key] = v

    for t, p in recs:
        b = (t - t0) // 100
        a = acc[b]
        sid = p[0]
        if sid == 0x40:
            a["alt"].append(be16(p, 2, True) / 10)
            a["climb"].append(be16(p, 8, True) / 10)
        elif sid == 0x20:
            d = decode(p)
            for key, name in (("thr", "Throttle"), ("amps", "Motor current"), ("escV", "Input voltage"),
                              ("rpm", "Motor speed (electrical)"), ("fet", "Controller temp"),
                              ("becT", "BEC temp"), ("becV", "BEC voltage")):
                v = d[name][0]
                if v is not None:
                    a[key].append(v)
        elif sid == 0x7F:
            fl, ho, fa = be16(p, 10), be16(p, 12), be16(p, 2)
            counter("fl", None if fl == 0xFFFF else fl, b)
            counter("holds", None if ho == 0xFFFF else ho, b)
            counter("fades", None if fa == 0xFFFF else fa, b)
            rx = be16(p, 14)
            if rx != 0xFFFF:
                a["rxV"].append(rx / 100)
        elif sid == 0x7E:
            v = i8(p, 8)
            if v < -1:
                a["dbm"].append(v)
        elif sid == 0x14:
            x, y, z = (be16(p, o, True) / 100 for o in (2, 4, 6))
            a["g"].append(math.sqrt(x * x + y * y + z * z))
        elif sid == 0x1A:
            rates = [be16(p, o, True) / 10 for o in (2, 4, 6)]
            a["rot"].append(max(abs(v) for v in rates))
            for key, v in zip(("rx", "ry", "rz"), rates):
                a[key].append(v)
        elif sid == 0x05:
            a["fm"].append(p[2])
        elif sid == 0x42 and p[2] & 0xF0 == 0x10:
            cells = [le16(p, 4 + 2 * k) for k in range(3)]
            if all(c not in (0, 0xFFFF) for c in cells):
                for k, c in enumerate(cells):
                    a["c%d" % (k + 1)].append(c / 1000)
                a["battT"].append(i8(p, 3))
    keys = ["alt", "climb", "thr", "amps", "ampsMax", "escV", "rpm", "fet", "becT", "becV", "rxV", "dbm",
            "fl", "holds", "fades", "g", "rot", "rx", "ry", "rz", "fm", "c1", "c2", "c3", "battT"]
    out = {k: [] for k in keys}
    for a in acc:
        for k in keys:
            if k == "ampsMax":
                v = max(a["amps"]) if a["amps"] else None
            elif k in ("fl", "holds", "fades"):
                v = sum(a[k]) if a[k] else (0 if k in a else None)
            elif k in ("becV", "rxV"):
                v = min(a[k]) if a[k] else None
            elif k in ("g", "rot"):
                v = max(a[k]) if a[k] else None
            elif k == "fm":
                v = a[k][-1] if a[k] else None
            else:
                v = sum(a[k]) / len(a[k]) if a[k] else None
            out[k].append(rnd(v, 3 if k.startswith("c") else 2))
    # forward-fill slow signals so charts are continuous
    for k in ("escV", "c1", "c2", "c3", "battT", "fm", "fet", "becT", "rxV", "becV", "dbm"):
        prev = None
        for i, v in enumerate(out[k]):
            if v is None:
                out[k][i] = prev
            else:
                prev = v
    return out


def battery_info(recs):
    ids = Counter(p[8:16].hex() for _, p in recs if p[0] == 0x42 and p[2] & 0xF0 == 0x80 and p[3] and p[10] and p[15])
    if not ids:
        return None
    bid = ids.most_common(1)[0][0]
    pk = next(p for _, p in recs if p[0] == 0x42 and p[2] & 0xF0 == 0x80 and p[8:16].hex() == bid)
    lim = next((p for _, p in recs if p[0] == 0x42 and p[2] & 0xF0 == 0x90 and any(p[4:])), None)
    return {"id": bid, "chem": "LiPo" if pk[3] == 1 else str(pk[3]), "cells": pk[4], "cycles": le16(pk, 6),
            "capacity": le16(lim, 4) if lim else None, "cRating": le16(lim, 6) / 10 if lim else None,
            "full": le16(lim, 12) / 1000 if lim else None, "empty": le16(lim, 10) / 1000 if lim else None}


def main(path):
    sessions, size = read_sessions(path)
    out = []
    all_recs = []
    total_dur = 0
    for k, s in enumerate(sessions):
        recs = [(t, p) for t, p in s["recs"]]
        clock = next((p for _, p in recs if p[0] == 0x7C), None)
        unix = struct.unpack_from("<I", clock, 8)[0] if clock else None
        data = [(t, p) for t, p in recs if p[0] != 0x7C]
        dur = (data[-1][0] - data[0][0]) / 100 if len(data) > 1 else 0
        total_dur += dur
        all_recs += recs
        start = datetime.fromtimestamp(unix, BERLIN) if unix else None
        name = None
        for h in s["headers"]:
            if h[0] == 0x01 and h[1] == 0x00:
                name = h[8:].split(b"\x00")[0].decode("latin1").strip()
        entry = {
            "index": k, "offset": s["offset"], "model": name, "unix": unix,
            "start": start.isoformat() if start else None, "duration": round(dur, 2),
            "records": len(recs), "headers": [h.hex(" ") for h in s["headers"]],
            "battery": battery_info(data),
            "inventory": inventory(recs, dur) if data else [],
        }
        if data:
            entry["series"] = series(data)
        out.append(entry)
    file_dur = sum(s["duration"] for s in out)
    print("window.TLM_DATA = " + json.dumps({
        "file": {"name": path.split("/")[-1], "size": size, "sessions": len(out)},
        "fileInventory": inventory(all_recs, file_dur),
        "sessions": out,
    }, separators=(",", ":")) + ";")


if __name__ == "__main__":
    main(sys.argv[1])
