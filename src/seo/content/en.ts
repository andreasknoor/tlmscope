import type { Content } from "./types.ts";

export const en: Content = {
  chrome: {
    home: "TLMscope",
    guides: "Guides",
    switchTo: { label: "Deutsch", title: "Diese Seite auf Deutsch" },
    cta: {
      title: "Look at your own flights",
      text: "Open TLMscope and drop your .TLM file onto the page, or load the demo flight. Everything runs in your browser; your files are never uploaded.",
      button: "Open TLMscope",
    },
    footer: { by: "TLMscope by Andreas Knoor", source: "Source code", notAffiliated: "Not affiliated with Spektrum", legal: "Imprint & privacy" },
    nav: { open: "Open TLM files", understand: "Understand telemetry", radios: "Supported radios", help: "Help", faq: "FAQ", compare: "Compare" },
    faq: "Frequently asked questions",
    linkToQuestion: "Link to this question",
    allQuestions: { open: "Open all", close: "Close all" },
    updated: "Updated",
    skip: "Skip to content",
  },

  home: {
    h1: "See what happened in your flights",
    sub: "Drop a Spektrum telemetry log and get a plain-language summary of each flight.",
    facts: [
      { icon: "summary", text: "A summary of every flight in plain words" },
      { icon: "map", text: "Flight path on a map and in 3D, with replay" },
      { icon: "battery", text: "Battery condition across flights" },
      { icon: "lock", text: "Read in your browser, never uploaded" },
    ],
    drop: { title: "Drop .TLM files here", touchTitle: "Add your .TLM files", button: "Choose files", aria: "Choose .TLM files" },
    demo: { label: "Try the demo flight", alt: "The overview of a demo flight in TLMscope" },
    tilesLabel: "More about TLMscope",
    more: { read: "Read the full guide", close: "Close" },
    guidesLabel: "Guides",
    tiles: [
      {
        id: "see", icon: "summary", label: "What you see", title: "What you will see", page: "help",
        body: [{ t: "ul", items: [
          "A summary of every flight in plain words: airtime, highest point, motor time, lift found and battery use.",
          "Charts for height, motor, battery, signal strength and radio link.",
          "The flight path on a map and in 3D, with a replay (needs a GPS sensor).",
          "How each of your batteries ages from flight to flight.",
          "The total flight time per model, and the session list as a CSV file for your own flight log.",
        ] }],
      },
      {
        id: "logs", icon: "usb", label: "Find your logs", title: "Where to find your logs", page: "open",
        body: [
          { t: "p", text: "**NX and iX:** connect the transmitter by USB, open its internal storage and copy the `.TLM` files, also from the `AutoLog` folder." },
          { t: "p", text: "**DX:** take out the SD card and copy the `.TLM` files." },
        ],
      },
      {
        id: "radios", icon: "radio", label: "Supported", title: "Supported transmitters and sensors", page: "radios",
        body: [
          { t: "p", text: "Spektrum NX and iX logs are tested. DX logs should work but are not tested yet." },
          { t: "p", text: "The radio link needs any telemetry receiver, motor and battery need Smart electronics, height needs a vario or a GPS sensor and the map needs a GPS sensor." },
        ],
      },
      {
        id: "data", icon: "chart", label: "Understand your data", title: "Understand your telemetry", page: "understand",
        body: [
          { t: "p", text: "What frame losses, fades, holds, signal strength, receiver voltage and battery resistance mean, in plain words." },
          { t: "p", text: "With the limits TLMscope uses for its ratings, and the reasons for them." },
        ],
      },
      {
        id: "faq", icon: "question", label: "Questions", title: "Questions", page: "faq",
        body: [
          { t: "p", text: "**Does it work on a Mac or a phone?** Yes. It runs in any current browser. Nothing to install." },
          { t: "p", text: "**What is a .TLM file?** The telemetry log your Spektrum transmitter saves while you fly." },
          { t: "p", text: "**Is it free?** Yes, and it is an independent hobby project." },
        ],
      },
    ],
  },

  guides: {
    open: {
      title: "How to Open Spektrum .TLM Files (NX, iX, DX)",
      description: "Where to find Spektrum telemetry logs (.TLM) on NX, iX and DX transmitters, how to copy them to your computer and how to view them in your browser.",
      h1: "How to open Spektrum .TLM telemetry files",
      lead: "A Spektrum transmitter with telemetry saves your flights as .TLM files. Here is where to find them, how to copy them to your computer and how to look at them without installing anything.",
      sections: [
        {
          h2: "What a .TLM file is",
          blocks: [
            { t: "p", text: "A .TLM file is a binary telemetry log written by the transmitter. It stores the values that the telemetry receiver and the sensors in your model sent during the flight: radio link quality, signal strength, receiver voltage and, depending on your hardware, motor current, battery cells, height, climb rate, GPS position and more. Every time the receiver powers up, a new session starts in the file." },
          ],
        },
        {
          h2: "Get the files from an NX or iX transmitter",
          blocks: [
            { t: "ol", items: [
              "Switch the transmitter on and connect it to your computer with a USB cable.",
              "In the transmitter's USB settings, choose the option to access the internal storage.",
              "Open the drive that appears. Your logs are `.TLM` files named after the model, plus the `AutoLog` folder, where recent firmware writes a log automatically for each flight session.",
              "Copy the files you want to your computer.",
            ] },
            { t: "note", text: "The transmitter tidies up its automatic logs. According to Spektrum's change log for NX, it keeps only the newest few files, so copy a log soon after a flight if you want to keep it." },
          ],
        },
        {
          h2: "Get the files from a DX transmitter",
          blocks: [
            { t: "p", text: "DX transmitters with telemetry logging store the logs on the SD card. Make sure logging is switched on in the transmitter's telemetry settings, fly, then take the card out and copy the `.TLM` files to your computer. The exact menu names depend on the model and the firmware version." },
          ],
        },
        {
          h2: "Open the files in TLMscope",
          blocks: [
            { t: "ol", items: [
              "Open [TLMscope](home) in any current browser.",
              "Drop one or more `.TLM` files onto the page, or click to choose them.",
              "Pick a session in the list. Each power-up of the receiver is one session; flights, ground tests and short power-ups are labelled.",
              "Use the tabs for height, motor and energy, battery, radio link and the aircraft. Switch on “Show details” for exact values.",
            ] },
            { t: "p", text: "Large logs with many flights take a few seconds to read. Everything happens on your device, nothing is uploaded." },
          ],
        },
        {
          h2: "If a file does not open",
          blocks: [
            { t: "ul", items: [
              "Check that it is a Spektrum file. EdgeTX, OpenTX and other radio systems write different log formats, which TLMscope does not read yet.",
              "Damaged files are read as far as possible: TLMscope skips broken records, shows a warning and keeps the rest.",
              "A session without a height sensor or GPS still opens; the views that need that data tell you what is missing.",
              "Files larger than 256 MB are refused. Real logs are a few MB.",
            ] },
          ],
        },
        {
          h2: "Want to try it first?",
          blocks: [
            { t: "p", text: "Load the demo on the [home page](home): a glider with GPS and a thermal, and a 3D plane with flight modes, hard aerobatics and height from GPS. Together they show every view." },
            { t: "p", text: "To find out what the numbers mean, read [Understand your Spektrum telemetry](page:understand). For the list of tested transmitters, see [Supported transmitters and sensors](page:radios)." },
          ],
        },
      ],
      faq: [
        {
          q: "Where does a Spektrum NX store its telemetry logs?",
          a: "On its internal storage: logs named after the model as .TLM files, and automatic per-session logs in the AutoLog folder. Connect the transmitter by USB and choose the option to access the internal storage to copy them.",
        },
        {
          q: "Can I open .TLM files on a Mac or a phone?",
          a: "Yes. TLMscope runs in the browser, so any current browser on macOS, Linux, Windows, Android or iOS works. Nothing needs to be installed.",
        },
        {
          q: "Is my .TLM file uploaded when I open it in TLMscope?",
          a: "No. The file is read in your browser and never leaves your device.",
        },
      ],
    },

    understand: {
      title: "Understand Spektrum Telemetry: Fades, Holds & More",
      description: "What frame losses, fades, holds, signal strength, receiver voltage and battery resistance in Spektrum telemetry mean, and which values to watch.",
      h1: "Understand your Spektrum telemetry",
      lead: "A telemetry log is full of counters and voltages. This page explains the important ones in plain words, together with the rules of thumb TLMscope uses for its ratings.",
      sections: [
        {
          h2: "Radio link: frame losses, fades and holds",
          blocks: [
            { t: "p", text: "The receiver counts what goes wrong on the radio link:" },
            { t: "ul", items: [
              "**Frame losses** are frames that no receiver got. A few are normal. The transmitter sends about 91 frames per second, so 100 per minute is under 2 % of them. TLMscope rates up to about 20 per minute as high quality and up to about 100 per minute in the air as normal, in line with Spektrum receiver manuals. What counts is how fast the counter rises in the air, not its total; on the ground it rises much faster anyway.",
              "**Fades** count the frames a single receiver missed. A is the main receiver (with two antennas, both count as one); B, L and R are remote receivers. A is usually the highest, because the main receiver sits deep in the fuselage between cables, battery and controller. Compare the remote receivers with each other: one far above the others is badly placed. With only one receiver, look at the frame losses instead.",
              "**Holds** are half a second or longer without any signal (45 frames in a row missed by every receiver). The receiver then goes to its hold or failsafe setting. A hold in flight always rates the radio link as critical and is marked on its timeline.",
            ] },
            { t: "note", text: "These counters start at zero when the receiver powers up. TLMscope shows what happened during the session." },
            { t: "img", name: "link", alt: "Radio link tab of a demo flight: radio link rated high, signal strength normal, and both over time in green, light green and yellow", caption: "The Radio link tab: green is good, yellow shows where the signal got weak." },
          ],
        },
        {
          h2: "Signal strength",
          blocks: [
            { t: "p", text: "The signal strength at the receiver is given in dBm: the closer to zero, the stronger. In TLMscope's own sample flights, frame losses rose sharply below about −80 dBm. It therefore rates −70 dBm or better as high, down to −80 dBm as normal, down to −85 dBm as weak and anything lower as critical." },
            { t: "p", text: "The Radio link tab plots the signal against height, because height and distance often go together. Under “Over time”, click a level to show only those seconds and step from one to the next." },
          ],
        },
        {
          h2: "Receiver voltage",
          blocks: [
            { t: "p", text: "The voltage at the receiver should stay steady under load. TLMscope rates 5.2 V or more as steady, 4.8 V or more as OK, anything above 4.0 V as dips and below that as brown-out risk. Look for dips when several servos move at once. The moments of switching on and off, such as unplugging the battery after landing, are left out, so they do not look like a brown-out. The AR8360T manual asks to stay above 4.8 V under load, and receivers of this family drop out below about 3.5 V." },
          ],
        },
        {
          h2: "Battery: charge used, cells and internal resistance",
          blocks: [
            { t: "ul", items: [
              "**Charge used** is the share of the pack's capacity drawn in the session. TLMscope rates up to 50 % as plenty left, up to 70 % as fine, up to 80 % as land soon and more as over-drawn: the common 80 % rule.",
              "**Cell voltages** from a Spektrum Smart battery show the lowest and highest cell. A growing difference between cells points to an unbalanced pack.",
              "**Internal resistance per cell** is estimated from how far the voltage sags when the motor draws current, so it includes the wiring. Under 10 mΩ per cell is excellent, up to 12 mΩ acceptable, and above 15 mΩ it is time to retire the pack, a rule of thumb from LiPo guides. The Batteries page follows this value from flight to flight and estimates how many charge cycles are left.",
              "**Temperature** of 35 to 45 °C after a flight is normal. TLMscope warns from 45 °C and treats 60 °C as the usual ceiling. Batteries without a temperature sensor send 0; TLMscope then shows no battery temperature.",
            ] },
            { t: "img", name: "battery", alt: "Battery tab of a demo flight: which battery, charge level from 99 to 93 percent, battery condition good, and the voltage per cell with dips during the motor runs", caption: "The Battery tab: the voltage per cell dips exactly when the motor runs." },
          ],
        },
        {
          h2: "Motor and speed controller",
          blocks: [
            { t: "p", text: "Smart speed controllers such as the Avian report motor current, input voltage, throttle, rpm and temperatures. TLMscope uses them to find the motor runs, to work out the charge used per minute in the air and the height gained per 100 mAh in motor climbs." },
          ],
        },
        {
          h2: "Height, climb rate and thermals",
          blocks: [
            { t: "p", text: "A vario or altimeter sensor reports height and climb rate. TLMscope splits a flight into motor climbs, glides and lift: climbing with the motor off for about ten seconds or longer is marked as lift. The centres of thermals are estimated from circling flight and shown on the map." },
            { t: "img", name: "lift", alt: "Height and lift tab of a demo flight: height profile split into motor climbs, gliding and one thermal, with motor runs, lift and gliding time below", caption: "Height and lift: motor climbs, glides and the thermal of one flight." },
            { t: "p", text: "Without a vario, a Spektrum GPS sensor gives the height above the take-off spot. It is less exact, about ±5 to 10 m, so TLMscope shows the highest point and the height profile, but no climbs, lift or glide." },
          ],
        },
        {
          h2: "Time in the air and total flight time",
          blocks: [
            { t: "p", text: "The time in the air comes from the height, or from the GPS speed, or, without either, from the motor and the model's movement; that last estimate is marked “about”. Pauses of two minutes or more on the ground between two flights of one session do not count. Above the session list, TLMscope adds up the time in the air of the loaded flights, per model when one is chosen, marked “≈” when part of it is estimated." },
          ],
        },
        {
          h2: "Loads and rotation",
          blocks: [
            { t: "p", text: "Receivers with AS3X or SAFE report loads in g and rotation rates. TLMscope uses them to detect circling and to tell how gentle, moderate, sporty or hard a flight was." },
          ],
        },
        {
          h2: "Stabilization and flight modes",
          blocks: [
            { t: "p", text: "Receivers with AS3X or SAFE also report the flight mode and which functions are on: AS3X, SAFE and heading hold. The Aircraft tab shows the time in the air per function and per flight mode, and the AS3X gain for roll, pitch and yaw. A gain of 0 means AS3X does not correct at all." },
          ],
        },
        {
          h2: "Five questions after every flight",
          blocks: [
            { t: "p", text: "You do not need to read every value. These five questions cover what matters most:" },
            { t: "ol", items: [
              "**Were there holds?** If so, check the antenna routing and the installation before the next flight.",
              "**How much charge was used?** Over 80 % means landing earlier next time or setting a shorter timer.",
              "**Did the receiver voltage stay steady?** Dips under load point to the power supply: BEC, cables or connectors.",
              "**Are the cells balanced?** A difference between cells that grows from flight to flight is an early warning.",
              "**Is the battery ageing?** The Batteries page follows its internal resistance across flights; a value that keeps rising shows a pack wearing out long before it fails in flight.",
            ] },
          ],
        },
        {
          h2: "What a log cannot tell you",
          blocks: [
            { t: "p", text: "A log holds only what the sensors in the model sent: no vario, no climb rate. It records at intervals, not continuously, so a very short event can fall between two readings. And it does not replace looking at the model: it shows that the voltage dropped, not which connector is loose." },
          ],
        },
      ],
      faq: [
        {
          q: "How many frame losses are normal on a Spektrum receiver?",
          a: "Spektrum receiver manuals describe up to about 100 per minute in the air as normal. TLMscope rates up to about 20 per minute as high quality. Holds, half a second or longer without signal, should not happen.",
        },
        {
          q: "What is a hold in Spektrum telemetry?",
          a: "A hold is half a second or longer without any signal at the receiver: 45 frames in a row that no receiver got. The receiver then applies its hold or failsafe setting. TLMscope always rates a hold during flight as critical.",
        },
        {
          q: "When should I retire a LiPo battery?",
          a: "A common rule of thumb is to retire a pack when its internal resistance reaches about 15 mΩ per cell. TLMscope estimates this value from the voltage sag in flight and follows it across flights for Spektrum Smart batteries.",
        },
      ],
    },

    radios: {
      title: "Supported Spektrum Transmitters and Sensors",
      description: "Which Spektrum transmitters (NX, iX, DX) and telemetry sensors TLMscope reads, what data each one needs and what is tested, expected or not supported.",
      h1: "Supported Spektrum transmitters and sensors",
      lead: "TLMscope reads the .TLM telemetry logs that Spektrum transmitters save. This is what works today, what has been tested and what is not covered.",
      sections: [
        {
          h2: "Transmitters",
          blocks: [
            { t: "table", head: ["Transmitter", "Where the logs are", "Status"], rows: [
              ["Spektrum NX6, NX8, NX10 (incl. “+” versions)", "Internal storage: `Model.TLM` and the `AutoLog` folder. Copy via USB.", "Tested (NX8+)"],
              ["Spektrum iX12, iX14, iX20", "Internal storage, copy via USB.", "Tested"],
              ["Spektrum DX6 G2/G3, DX7 G2, DX8 G2, DX9, DX10t, DX18 (G2 and later), DX18t, DX20", "SD card, once telemetry logging is on.", "Expected to work, not tested yet"],
            ] },
            { t: "p", text: "Where to find the files is explained in [How to open Spektrum .TLM files](page:open)." },
          ],
        },
        {
          h2: "What you can see, and what it needs",
          blocks: [
            { t: "p", text: "A log only contains what the sensors in your model sent. Missing hardware means missing data, not an error." },
            { t: "table", head: ["Data", "Needs", "Status"], rows: [
              ["Radio link: frame losses, holds, fades, receiver voltage, signal strength", "Any Spektrum telemetry receiver (model names ending in “T”)", "Tested"],
              ["Motor, controller and BEC: rpm, current, voltage, throttle, temperatures", "Spektrum Smart ESC (e.g. Avian)", "Tested"],
              ["Battery: cell voltages, temperature, ID, charge cycles, capacity", "Spektrum Smart battery, connected through a Smart ESC", "Tested"],
              ["Height and climb rate", "Vario / altimeter sensor, or a receiver that reports it", "Tested"],
              ["Height above ground without a vario (less exact, no climbs or lift)", "Spektrum GPS telemetry sensor or SkyID Remote ID module", "Tested"],
              ["Loads (g) and rotation rates", "Receiver with AS3X / SAFE", "Tested"],
              ["Throttle stick position", "Recent NX firmware (AutoLog files)", "Tested"],
              ["Stabilization (AS3X, SAFE, heading hold) per flight mode, AS3X gain", "Receiver with AS3X / SAFE", "Tested"],
              ["Map, distance, speed over ground", "Spektrum GPS telemetry sensor or SkyID Remote ID module", "Tested with real GPS logs"],
              ["Other sensors (airspeed, extra current or temperature sensors, …)", "X-Bus / SRXL2 sensors", "Shown as raw data for now"],
            ] },
          ],
        },
        {
          h2: "Not supported",
          blocks: [
            { t: "ul", items: [
              "EdgeTX / OpenTX logs (CSV, for example RadioMaster, FrSky, ExpressLRS, Crossfire): planned, not available yet.",
              "Other radio systems with their own log formats (Jeti, Graupner HoTT, Futaba, Multiplex …).",
              "Flight controller logs (ArduPilot, Betaflight blackbox, iNav).",
              "Spektrum transmitters that cannot save telemetry logs (for example the DX6i).",
              "Live telemetry during the flight. TLMscope works with the saved files afterwards.",
              "Cars and boats (Spektrum surface radios) are not a focus. Their logs may partly work.",
            ] },
          ],
        },
        {
          h2: "Help to widen the support",
          blocks: [
            { t: "p", text: "Logs from NX and iX transmitters have been tested so far. If you fly a DX transmitter, or other Spektrum sensors, a log file helps a lot to check and extend the decoding. Tell me through the **Feedback** button in TLMscope (see [How can I send feedback or a log?](page:faq#send-feedback)), or open an issue in the [GitHub project](https://github.com/andreasknoor/tlmscope). To find out which value in a log belongs to which stick, switch or knob of your transmitter, the [transmitter ground test](https://www.tlmscope.com/debug) guides you through moving each control while the transmitter records. Only share logs you are comfortable sharing: logs with GPS show where you fly." },
            { t: "p", text: "TLMscope is an independent project and is not made or endorsed by Spektrum or Horizon Hobby." },
          ],
        },
      ],
    },

    help: {
      title: "TLMscope Help: How to Read Your Flight Views",
      description: "A tour of TLMscope: overview, height and lift, flight path with 3D replay, motor and energy, battery, radio link, and the Batteries and Data inventory pages.",
      h1: "TLMscope help",
      lead: "A quick tour of what each view shows and how to get the most out of it.",
      sections: [
        {
          h2: "First steps",
          blocks: [
            { t: "ol", items: [
              "Drop one or more `.TLM` files onto the start page, or click to choose them. You can add more files any time.",
              "Pick a session in the list on the left. On a phone the list is a picker at the top. Each power-up of the receiver is one session.",
              "“Flights” shows real flights only, “All” also ground tests and short power-ups. With several models loaded, you can limit the list to one model.",
              "Above the list you see the total flight time of the loaded flights, for the chosen model. “Export as CSV” saves the sessions of the list as a spreadsheet file, made in your browser.",
            ] },
            { t: "img", name: "overview", alt: "TLMscope overview of a demo flight: summary sentence, key numbers and the height profile with motor climbs, lift and gliding", caption: "The overview of a flight: summary, key numbers and height profile." },
          ],
        },
        {
          h2: "Plain view and details",
          blocks: [
            { t: "p", text: "By default you see plain-language summaries and four-level ratings, for example Critical, Weak, Normal and High. Switch on “Show details” at the top right for exact values, more charts and the limits behind every rating. The reasons for the limits are explained in [Understand your Spektrum telemetry](page:understand). The cards of the overview link to the page with the detail behind them and put the cursor on the moment behind the rating, for example the weakest signal." },
          ],
        },
        {
          h2: "The tabs of a session",
          blocks: [
            { t: "ul", items: [
              "**Overview**: a summary sentence, key numbers, the height profile with motor climbs, glides and lift, and the health check, whose cards link to the details.",
              "**Height & lift**: climbs, lift found and the glide; without a vario, the height from GPS.",
              "**Flight path**: the path on a map and in 3D with a replay, and the ground speed (needs a GPS sensor).",
              "**Motor & energy**: motor runs, current, charge used and the climb efficiency.",
              "**Battery**: charge level, cell voltages and the voltage sag that gives the internal resistance.",
              "**Radio link**: signal strength, frame losses and holds over time, and the signal against height. Click a level under the timeline to show only it and step through it.",
              "**Aircraft**: temperatures, receiver and BEC voltage, loads, the flight modes over time and the stabilization per flight mode with the AS3X gain.",
              "**Raw data**: all decoded sensor streams, shown with “Show details”.",
            ] },
          ],
        },
        {
          h2: "Flight path and replay",
          blocks: [
            { t: "p", text: "With a GPS sensor the flight path is shown on a map in 3D. Choose between the 3D view, the map view from above and the follow view (beta), where the camera flies behind the model. Hold the right mouse button and move up or down to tilt the view. The mouse wheel scrolls the page; Ctrl and the wheel (⌘ on a Mac) zoom the map, and on a phone two fingers move it. The replay plays the flight back at up to 60 times speed; the model marker, every chart and an optional vario tone follow. Space starts and stops it, and a full-screen mode gives the map more room. The map options set the colour, the line style, the model shown in the replay, a ground shadow and the relief (beta). TLMscope keeps them from flight to flight." },
            { t: "img", name: "path", alt: "The flight path of a demo flight in 3D on a map, coloured by motor climb, glide and thermal, with the replay below", caption: "The flight path in 3D, coloured by phase, with the replay below." },
          ],
        },
        {
          h2: "Batteries and data inventory",
          blocks: [
            { t: "ul", items: [
              "**Batteries** groups the flights by Spektrum Smart battery. Each pack shows its charge cycles, its condition, a trend of the internal resistance and an estimate of the cycles left. The list of sessions of a pack opens with one click.",
              "**Data inventory** lists everything found in the loaded files, including the parts that are not understood yet.",
            ] },
          ],
        },
        {
          h2: "Keys, language and privacy",
          blocks: [
            { t: "ul", items: [
              "Arrow left and right move to the older or newer session; arrow up and down move through the list while it has the focus.",
              "Space starts and stops the replay; Esc closes the full-screen mode.",
              "EN and DE at the top right switch the language.",
              "Files are read in your browser and never uploaded. Only the map loads map images from OpenFreeMap, and the relief (beta), when switched on, elevation data from Amazon Web Services.",
            ] },
          ],
        },
      ],
    },

    faq: {
      title: "TLMscope FAQ: Spektrum TLM Files, Privacy, Mac",
      description: "Answers to common questions about Spektrum .TLM files, opening them on Mac, Linux and phones, privacy, supported transmitters, frame losses and battery age.",
      h1: "Frequently asked questions",
      lead: "Short answers about opening Spektrum telemetry logs and reading them in TLMscope. Each answer points to the page with the details.",
      sections: [],
      faq: [
        { q: "What is TLMscope?", a: [
          { t: "p", text: "TLMscope is a free, browser-based viewer and analyzer for Spektrum .TLM telemetry logs. It runs on Windows, macOS, Linux, Android and iOS without installing anything, and the files stay on your device." },
          { t: "p", text: "From a log it shows:" },
          { t: "ul", items: ["a plain-language summary of each flight", "charts of height, climb, motor, battery and radio link", "a GPS map with 3D replay", "thermals", "flight modes and stabilization", "battery ageing across flights", "the total flight time per model and a CSV export of the session list"] },
        ] },
        { q: "What is a Spektrum .TLM file?", a: "A .TLM file is the telemetry log a Spektrum transmitter saves while you fly. It holds what the receiver and the sensors in the model reported, for example signal strength, battery voltage, motor current, height and GPS position. See [How to open Spektrum .TLM files](page:open)." },
        { q: "How do I open a .TLM file?", a: [
          { t: "ol", items: ["Copy the .TLM file from your transmitter to your computer or phone.", "Drop it onto the start page, or click to choose it.", "TLMscope reads it in your browser and shows a summary of each flight."] },
          { t: "p", text: "No log at hand? Load the demo flight. The [step-by-step guide](page:open) shows where the files are on NX, iX and DX transmitters." },
        ] },
        { q: "Where does a Spektrum NX store its telemetry logs?", a: [
          { t: "p", text: "On its internal storage:" },
          { t: "ul", items: ["logs named after the model, as .TLM files", "automatic logs for each session, in the **AutoLog** folder"] },
          { t: "p", text: "Connect the transmitter by USB and choose the option to access the internal storage to copy them." },
        ] },
        { q: "Is there a Spektrum TLM viewer for Mac, Linux or phones?", a: "Yes. TLMscope is a web page, so it runs in a current browser on Windows, macOS, Linux, Android and iOS. Nothing needs to be installed. The map and the 3D replay use WebGL, which current browsers support." },
        { q: "Are my flight logs uploaded anywhere?", a: [
          { t: "p", text: "No. Files are read in your browser and never leave your device." },
          { t: "p", text: "Only for logs with GPS, the map loads map images from OpenFreeMap, which therefore sees roughly where you flew. The same goes for the elevation data of the relief view (beta) from Amazon Web Services, loaded only when you switch it on. A CSV export is made in your browser and saved on your device. See the [privacy notice](legal)." },
        ] },
        { q: "Does TLMscope work without internet?", a: [
          { t: "p", text: "Yes, after one visit with internet:" },
          { t: "ol", items: ["Open TLMscope once with internet.", "Wait until the footer says **Works offline**.", "From then on it also opens without a connection, for example at the flying field."] },
          { t: "p", text: "On iPhone and iPad, add TLMscope to the home screen so Safari keeps it. Only the map in the Flight path tab needs internet." },
        ] },
        { id: "install-app", q: "How do I install TLMscope on my phone or laptop?", a: [
          { t: "p", text: "TLMscope runs in the browser, so there is nothing to download from an app store. You can still add it like an app:" },
          { t: "ul", items: [
            "**Android (Chrome):** open TLMscope, tap the menu ⋮ and choose **Install app** or **Add to Home screen**.",
            "**iPhone and iPad (Safari):** tap **Share**, then **Add to Home Screen**. This also keeps the offline copy, which Safari otherwise deletes after some days without use.",
            "**Laptop with Chrome or Edge:** click the install icon at the right end of the address bar.",
            "**Mac with Safari:** choose **File → Add to Dock**.",
            "**Firefox:** a bookmark is enough.",
          ] },
          { t: "p", text: "Then open TLMscope once with internet and wait until the footer says **Works offline**. After that it also opens without a connection; only the map needs internet." },
          { t: "p", text: "Your log files are never uploaded or stored." },
        ] },
        { id: "send-feedback", q: "How can I send feedback or a log?", a: [
          { t: "p", text: "Use the **Feedback** button at the top of TLMscope, or the small links under the ratings, at the end of each tab and on the start page:" },
          { t: "ol", items: ["Open the feedback dialog and check the technical details that would be sent. You can switch them off.", "Choose **Continue to the form**, pick the kind of message and write it down.", "Add your email address only if you want an answer."] },
          { t: "p", text: "The form is provided by Tally (Belgium) and loads only after you continue. Log files, file names, model names, positions and flight values are never sent. If I need a log, I ask you in my reply, and you can send it by email. Logs with GPS show where you fly, so only share what you are comfortable with." },
        ] },
        { q: "Which transmitters and sensors does it support?", a: "Logs from Spektrum NX and iX transmitters are tested. DX logs should work but are not tested yet. Radio link, motor, battery, height, GPS and more show up depending on the sensors your model carries. See [Supported transmitters and sensors](page:radios)." },
        { q: "How many frame losses are normal on a Spektrum receiver?", a: [
          { t: "ul", items: ["**Normal:** Spektrum receiver manuals describe up to about 100 per minute in the air as normal.", "**High quality:** TLMscope rates up to about 20 per minute as high quality.", "**Holds**, half a second or longer without signal, should not happen."] },
          { t: "p", text: "More in [Understand your Spektrum telemetry](page:understand)." },
        ] },
        { q: "What is a hold in Spektrum telemetry?", a: "A hold is half a second or longer without any signal at the receiver: 45 frames in a row that no receiver got. The receiver then applies its hold or failsafe setting. TLMscope always rates a hold during flight as critical." },
        { q: "When should I retire a LiPo battery?", a: "A common rule of thumb is to retire a pack when its internal resistance reaches about 15 mΩ per cell. TLMscope estimates this value from the voltage sag in flight and follows it across flights for Spektrum Smart batteries." },
        { q: "Can TLMscope count my flight hours per model?", a: [
          { t: "p", text: "Yes, for the logs you load. Above the session list, TLMscope adds up the time in the air of the loaded flights, for all models or the one you choose. Only time in the air counts: pauses of two minutes or more on the ground between two flights of one session are left out. When some flights have neither a height sensor nor GPS, their time is estimated from the motor and the model's movement, and the total is marked “≈”." },
          { t: "p", text: "TLMscope stores nothing between visits, so the total covers the files loaded now. To keep a flight log, use **Export as CSV**, see the next question." },
        ] },
        { q: "Can I convert a .TLM file to CSV or Excel?", a: [
          { t: "p", text: "Partly. **Export as CSV** above the session list saves one line per session: model, date, start time, type, session and air time, frame losses, holds, lowest receiver voltage, battery ID, charge used and the source file. With German settings it uses a semicolon and a decimal comma, so Excel opens it directly." },
          { t: "p", text: "There is no export of the raw sensor values. For that, TLM Viewer on Windows exports CSV; see [Spektrum TLM viewers compared](page:compare)." },
        ] },
        { q: "How can I see whether AS3X or SAFE was on during a flight?", a: "With a receiver with AS3X or SAFE, the log contains the flight mode and which functions were on. The **Aircraft** tab shows the time in the air per function (AS3X, SAFE, heading hold or no stabilization) and per flight mode, the AS3X gain for roll, pitch and yaw, and the flight modes over time. A gain of 0 means AS3X did not correct at all, for example with the gain knob turned down. More in [Understand your Spektrum telemetry](page:understand)." },
        { q: "What is the difference between a hold and a brown-out?", a: [
          { t: "ul", items: [
            "**Hold:** the radio link was lost for half a second or longer, so the receiver went to its hold or failsafe setting. The receiver voltage stays normal. TLMscope rates it in the radio link.",
            "**Brown-out:** the voltage at the receiver dropped so far that the receiver restarted. That is a power problem, not a radio problem. In the log it shows as a voltage drop and usually a gap or a new session, not as a hold.",
          ] },
          { t: "p", text: "Unplugging the battery after landing also makes the voltage fall. TLMscope leaves those moments out, so they do not count as a brown-out." },
        ] },
        { q: "Why does my log have gaps when the model is far away?", a: "Telemetry often reaches less far than the control link. Some Spektrum receivers send telemetry only over a short range, about 100 to 150 m. Beyond that the log has gaps or stops changing while the model is still under control. A gap alone is therefore no loss of control. The receiver keeps counting frame losses and holds, so look at them once the telemetry is back." },
        { q: "Can TLMscope show the height without a vario?", a: "Yes, with a Spektrum GPS sensor. TLMscope then takes the height above the take-off spot from the GPS altitude and shows the highest point and the height profile. GPS height is less exact, about ±5 to 10 m, so climbs, lift and glide still need a vario. Without a vario and without GPS the height stays empty, and the time in the air is estimated from the motor and the model's movement." },
        { q: "Is TLMscope free, and is it made by Spektrum?", a: "TLMscope is free, needs no account and is an independent hobby project by a model flyer. It is not made or endorsed by Spektrum or Horizon Hobby. How it compares with other viewers is in [Spektrum TLM viewers compared](page:compare)." },
        { q: "Is there an alternative to TLM Viewer?", a: [
          { t: "p", text: "Yes. The main options:" },
          { t: "ul", items: ["**TLM Viewer:** a long-standing, open-source Windows program with export to CSV and KML.", "**TLMscope:** free, runs in the browser on any device, explains each flight in plain words and exports the session list as CSV.", "**Log Explorer:** a paid desktop program that also reads other radio systems."] },
          { t: "p", text: "See [Spektrum TLM viewers compared](page:compare)." },
        ] },
      ],
    },

    compare: {
      title: "Spektrum TLM Viewers Compared: Browser vs Desktop",
      description: "TLMscope in the browser compared with TLM Viewer and Log Explorer for Spektrum telemetry logs: platforms, price, features and when to use which.",
      h1: "Spektrum TLM viewers compared",
      lead: "There are a few ways to look at a Spektrum telemetry log. This is a fair overview, with the strengths of each option. Facts about other tools come from their own product pages and release notes as of November 2026, and can change. We have not installed or tested the other programs ourselves.",
      sections: [
        {
          h2: "The options",
          blocks: [
            { t: "table", head: ["Option", "How it runs", "Platforms", "Good to know"], rows: [
              ["**TLMscope**", "In the browser, nothing to install", "Any current browser: Windows, macOS, Linux, Android, iOS", "Free, no account, files stay on your device. English and German. Plain-language summaries and ratings, charts, GPS map with 3D replay, battery ageing across flights, flight modes and stabilization, total flight time per model, CSV export of the session list. Reads Spektrum logs only. No export of raw data or KML."],
              ["**[TLM Viewer](https://www.tlmviewer.com)**", "Desktop program, download", "Windows; on a Mac only through a Windows emulator, not on Android, according to its documentation", "A long-standing free tool, open source (AGPLv3) since August 2026 with its [source code on GitHub](https://github.com/DroneTales/TLMViewer). Graphs, raw sensor data, session editing, export to CSV, KML (Google Earth) and TLM. Reads old and damaged log formats and many more sensors, for example turbines, combustion engines, PowerBox and Crossfire. English only."],
              ["**[Log Explorer](https://phaedradg.itch.io/ethos-log-explorer)**", "Desktop program for Windows, paid, with an Android companion app", "Windows and Android; macOS and Linux are claimed on the product page", "From $10 (pay what you want), with a license key tied to the Windows hardware ID. Reads FrSky Ethos and OpenTX logs and, according to its release notes since v3.0, Spektrum and Jeti logs. Keeps a library per model with notes and tags, compares flights, tracks battery resistance over time, links video files and can export a transparent overlay video. Also covers cost tracking, weather and model setup files, which are outside TLMscope."],
              ["Code libraries and small projects", "Code for developers", "Depends", "For example a Ruby gem and an Android reader on GitHub. Useful to build your own tools; the Android project describes itself as being in early development."],
            ] },
          ],
        },
        {
          h2: "When to use which",
          blocks: [
            { t: "ul", items: [
              "Pick **TLMscope** if you want a quick, readable answer to “what happened in this flight” on any device, without installing anything or uploading data.",
              "Pick **TLM Viewer** if you work on Windows and need to export the raw data (CSV) or the path (KML), or to edit and save logs again.",
              "Pick **Log Explorer** if you fly several radio systems, want a library of flights per model with notes, compare flights side by side or make overlay videos. Its price and the Windows license are the cost.",
              "Use both: they read the same files. Both are independent projects; neither is made by Spektrum.",
            ] },
          ],
        },
        {
          h2: "Where TLMscope is different",
          blocks: [
            { t: "ul", items: [
              "It runs in the browser on any computer and on phones, with nothing to install.",
              "It explains flights in plain language and rates them in four levels, with the exact values one click away.",
              "It follows each Smart battery across flights and estimates its remaining life.",
              "It finds thermals and shows them on the map and in the replay.",
              "It speaks English and German, and its source code is public on GitHub under the MIT licence.",
            ] },
          ],
        },
        {
          h2: "Honest limits of TLMscope",
          blocks: [
            { t: "ul", items: [
              "Only logs from NX and iX transmitters have been tested so far. See [Supported transmitters and sensors](page:radios).",
              "The CSV export has one line per session (date, times, radio link, battery). There is no export of the raw data and no KML for Google Earth.",
              "There is no flight comparison, no library of flights across visits and no notes or tags. Log Explorer has all of these.",
              "Log Explorer reads more radio systems. Its Spektrum support is newer than its FrSky support, and we have not compared the two programs on the same log file.",
              "It reads Spektrum logs only; EdgeTX logs are planned.",
            ] },
          ],
        },
      ],
      faq: [
        { q: "What is the best viewer for Spektrum TLM files?", a: [
          { t: "p", text: "It depends on what you need:" },
          { t: "ul", items: ["**TLMscope** is the quickest way to understand a flight on any device, in the browser and without installing anything.", "**TLM Viewer** suits Windows users who want to export raw data to CSV or the path to Google Earth.", "**Log Explorer** suits pilots who fly several radio systems and want a flight library."] },
        ] },
        { q: "Can I view Spektrum TLM files online?", a: "Yes. TLMscope is an online TLM viewer: open the page, drop the .TLM file and the flights appear. The file is read in your browser and is not uploaded to a server." },
        { q: "Does TLM Viewer run on a Mac?", a: "According to its documentation, TLM Viewer is a Windows program that runs on a Mac only through a Windows emulator. TLMscope runs in Safari, Chrome or Firefox on a Mac directly." },
      ],
    },
  },
};
