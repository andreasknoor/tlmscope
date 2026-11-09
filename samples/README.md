# Sample logs

The real flight logs used by the tests are not in the repository (private data). Put them here to run the full test suite:

| File | Content |
|---|---|
| `Easy_Glider_4.TLM` | Main log of an NX8+: 34 sessions, 5 flights (3 Oct to 7 Nov 2026). The reference values in the tests come from this file. |
| `002~Easy Glider 4_20260917.TLM` … `_20261003.TLM` | Five AutoLog files (Sept/Oct 2026), including the 0x7A stick stream. |
| `TelemetryLog supra .tlm` | 36 MB log of a fast electric model ("Supra Fly", model slot 9): 130 sessions, Oct 2024 to Mar 2026. The only sample with real GPS (24 sessions); vario only from Nov 2025. |

Without these files, `npm test` skips the tests that need them and runs the rest.

The HTML prototype (`prototype/index.html`) needs `prototype/data.js`, generated from the main log:

```sh
python3 -I prototype/export_data.py samples/Easy_Glider_4.TLM > prototype/data.js
```
