"""Decoder for Spektrum AirWare .TLM telemetry logs (NX/iX/DX transmitters).

File layout:
  * Header block: 0xFFFFFFFF + 32 bytes (model name / enabled sensors).
  * Data record:  uint32 LE timestamp (10 ms ticks) + 16-byte X-Bus sensor packet.
A run of header blocks starts a new session (one per model power-up).
Sensor packets are big-endian, except Smart Battery (0x42) which is little-endian.
"""
import struct
from datetime import datetime, timezone

HDR = b"\xff\xff\xff\xff"


def _be16(b, o, signed=False):
    return struct.unpack_from(">h" if signed else ">H", b, o)[0]


def _le16(b, o):
    return struct.unpack_from("<H", b, o)[0]


def decode_packet(p):
    """Return (kind, dict) for a 16-byte packet, or (None, None)."""
    sid = p[0]
    if sid == 0x20:  # Avian / Smart ESC
        rpm, vin, tfet, imot, tbec = (_be16(p, o) for o in (2, 4, 6, 8, 10))
        ibec, vbec, thr, pwr = p[12], p[13], p[14], p[15]
        return "esc", {
            "rpm": None if rpm == 0xFFFF else rpm * 10,
            "esc_v": None if vin == 0xFFFF else vin / 100,
            "fet_c": None if tfet == 0xFFFF else tfet / 10,
            "motor_a": None if imot == 0xFFFF else imot / 100,
            "bec_c": None if tbec == 0xFFFF else tbec / 10,
            "bec_a": None if ibec == 0xFF else ibec / 10,
            "bec_v": None if vbec == 0xFF else vbec * 0.05,
            "throttle_pct": None if thr == 0xFF else thr * 0.5,
            "power_pct": None if pwr == 0xFF else pwr * 0.5,
        }
    if sid == 0x42:  # Smart battery (little-endian)
        mtype = p[2] & 0xF0
        temp = struct.unpack_from("b", p, 3)[0]
        if mtype == 0x00:
            cur = struct.unpack_from("<I", p, 4)[0]
            mah, vmin, vmax = _le16(p, 8), _le16(p, 10), _le16(p, 12)
            if vmin == 0 and vmax == 0:
                return None, None  # battery not reporting yet
            return "batt", {
                "batt_c": None if temp == -128 else temp,
                "batt_a": None if cur == 0xFFFFFFFF else cur / 1000,
                "batt_mah": None if mah == 0xFFFF else mah,
                "cell_min_v": vmin / 1000,
                "cell_max_v": vmax / 1000,
            }
        if mtype == 0x10:
            cells = [_le16(p, 4 + 2 * k) for k in range(6)]
            cells = [c / 1000 for c in cells if c not in (0, 0xFFFF)]
            if not cells:
                return None, None
            return "cells", {f"cell{k+1}_v": v for k, v in enumerate(cells)}
        return None, None
    if sid == 0x40:  # Vario-S
        vals = [_be16(p, o, True) for o in (2, 4, 6, 8, 10, 12, 14)]
        return "vario", {"alt_m": vals[0] / 10, "climb_ms": vals[3] / 10}
    if sid == 0x7F:  # Flight log / QoS
        a, b, l, r, f, h, rxv = (_be16(p, o) for o in (2, 4, 6, 8, 10, 12, 14))
        return "qos", {
            "fades_a": None if a == 0xFFFF else a,
            "frame_loss": None if f == 0xFFFF else f,
            "holds": None if h == 0xFFFF else h,
            "rx_v": None if rxv == 0xFFFF else rxv / 100,
        }
    if sid == 0x7E:  # RPM / RSSI
        dbm_a = struct.unpack_from("b", p, 8)[0]
        dbm_b = struct.unpack_from("b", p, 9)[0]
        return "rssi", {
            "rssi_dbm": dbm_a if dbm_a < -1 else None,
            "rssi_pct": dbm_b if dbm_b > 0 else None,
        }
    if sid == 0x14:  # G-meter (0.01 g)
        x, y, z = (_be16(p, o, True) / 100 for o in (2, 4, 6))
        return "g", {"gx": x, "gy": y, "gz": z}
    if sid == 0x1A:  # Gyro (0.1 deg/s)
        x, y, z = (_be16(p, o, True) / 10 for o in (2, 4, 6))
        return "gyro", {"rate_x": x, "rate_y": y, "rate_z": z}
    if sid == 0x05:  # Flight controller status (AS3X+/SAFE)
        return "fm", {"flight_mode": p[2] + 1}
    if sid == 0x7C:  # Wall-clock (Unix seconds)
        return "clock", {"unix": struct.unpack_from("<I", p, 8)[0]}
    return None, None


def parse(path):
    """Parse a .TLM file into a list of session dicts with raw rows."""
    data = open(path, "rb").read()
    sessions, cur, in_hdr, i = [], None, False, 0
    while i + 4 <= len(data):
        if data[i:i + 4] == HDR:
            blk = data[i + 4:i + 36]
            if not in_hdr:
                cur = {"offset": i, "name": None, "rows": [], "unix": None}
                sessions.append(cur)
                in_hdr = True
            if blk[2:4] == b"\xb2\x00" or (cur["name"] is None and blk[0] == 0x01 and blk[1] == 0x00):
                name = blk[8:].split(b"\x00")[0].decode("latin1", "replace").strip()
                if name:
                    cur["name"] = name
            i += 36
            continue
        if i + 20 > len(data):
            break
        in_hdr = False
        ts = struct.unpack_from("<I", data, i)[0]
        kind, vals = decode_packet(data[i + 4:i + 20])
        if kind == "clock":
            if cur["unix"] is None:
                cur["unix"] = vals["unix"]
        elif kind:
            cur["rows"].append((ts, kind, vals))
        i += 20
    for s in sessions:
        s["start"] = datetime.fromtimestamp(s["unix"], timezone.utc) if s["unix"] else None
    return sessions
