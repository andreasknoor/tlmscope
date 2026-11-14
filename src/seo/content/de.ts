import type { Content } from "./types.ts";

export const de: Content = {
  chrome: {
    home: "TLMscope",
    guides: "Anleitungen",
    switchTo: { label: "English", title: "This page in English" },
    cta: {
      title: "Schau dir deine eigenen Flüge an",
      text: "Öffne TLMscope und lege deine .TLM-Datei auf der Seite ab oder lade den Demo-Flug. Alles läuft in deinem Browser, deine Dateien werden nie hochgeladen.",
      button: "TLMscope öffnen",
    },
    footer: { by: "TLMscope von Andreas Knoor", source: "Quellcode", notAffiliated: "Nicht mit Spektrum verbunden", legal: "Impressum & Datenschutz" },
    nav: { open: "TLM-Dateien öffnen", understand: "Telemetrie verstehen", radios: "Unterstützte Sender", help: "Hilfe", faq: "Häufige Fragen", compare: "Vergleich" },
    faq: "Häufige Fragen",
    linkToQuestion: "Link zu dieser Frage",
    skip: "Zum Inhalt springen",
  },

  home: {
    h1: "Sieh, was bei deinen Flügen passiert ist",
    sub: "Lege ein Spektrum-Telemetrie-Log ab und erhalte eine verständliche Zusammenfassung jedes Flugs.",
    facts: [
      { icon: "summary", text: "Eine Zusammenfassung jedes Flugs in einfachen Worten" },
      { icon: "map", text: "Flugweg auf der Karte und in 3D, mit Wiedergabe" },
      { icon: "battery", text: "Akkuzustand über mehrere Flüge" },
      { icon: "lock", text: "Im Browser gelesen, nie hochgeladen" },
    ],
    drop: { title: ".TLM-Dateien hier ablegen", touchTitle: ".TLM-Dateien hinzufügen", button: "Dateien auswählen", aria: ".TLM-Dateien auswählen" },
    demo: { label: "Demo-Flug ausprobieren", alt: "Die Übersicht eines Demo-Flugs in TLMscope" },
    tilesLabel: "Mehr zu TLMscope",
    more: { read: "Ganze Anleitung lesen", close: "Schließen" },
    guidesLabel: "Anleitungen",
    tiles: [
      {
        id: "see", icon: "summary", label: "Das siehst du", title: "Das siehst du", page: "help",
        body: [{ t: "ul", items: [
          "Eine Zusammenfassung jedes Flugs in einfachen Worten: Flugzeit, höchster Punkt, Motorzeit, gefundener Aufwind und Akkuverbrauch.",
          "Diagramme zu Höhe, Motor, Akku, Signalstärke und Funkverbindung.",
          "Den Flugweg auf der Karte und in 3D, mit Wiedergabe (mit GPS-Sensor).",
          "Wie jeder deiner Akkus von Flug zu Flug altert.",
        ] }],
      },
      {
        id: "logs", icon: "usb", label: "Logs finden", title: "Wo du deine Logs findest", page: "open",
        body: [
          { t: "p", text: "**NX und iX:** Sender per USB anschließen, den internen Speicher öffnen und die `.TLM`-Dateien kopieren, auch aus dem Ordner `AutoLog`." },
          { t: "p", text: "**DX:** SD-Karte herausnehmen und die `.TLM`-Dateien kopieren." },
        ],
      },
      {
        id: "radios", icon: "radio", label: "Unterstützt", title: "Unterstützte Sender und Sensoren", page: "radios",
        body: [
          { t: "p", text: "Logs von Spektrum-NX- und iX-Sendern sind getestet. DX-Logs sollten funktionieren, sind aber noch nicht getestet." },
          { t: "p", text: "Die Funkverbindung braucht einen beliebigen Telemetrieempfänger, Motor und Akku brauchen Smart-Elektronik, die Höhe ein Vario und die Karte einen GPS-Sensor." },
        ],
      },
      {
        id: "data", icon: "chart", label: "Daten verstehen", title: "Deine Telemetrie verstehen", page: "understand",
        body: [
          { t: "p", text: "Was Frame Losses, Fades, Holds, Signalstärke, Empfängerspannung und Akkuwiderstand bedeuten, in einfachen Worten." },
          { t: "p", text: "Mit den Grenzen, nach denen TLMscope bewertet, und den Gründen dafür." },
        ],
      },
      {
        id: "faq", icon: "question", label: "Fragen", title: "Fragen", page: "faq",
        body: [
          { t: "p", text: "**Funktioniert es auf Mac oder Handy?** Ja. Es läuft in jedem aktuellen Browser. Es muss nichts installiert werden." },
          { t: "p", text: "**Was ist eine .TLM-Datei?** Das Telemetrie-Log, das dein Spektrum-Sender während des Flugs speichert." },
          { t: "p", text: "**Ist es kostenlos?** Ja, und es ist ein unabhängiges Hobbyprojekt." },
        ],
      },
    ],
  },

  guides: {
    open: {
      title: "Spektrum TLM-Dateien öffnen (NX, iX, DX) – Anleitung",
      description: "Wo du Spektrum-Telemetrie-Logs (.TLM) bei NX-, iX- und DX-Sendern findest, wie du sie auf den Computer kopierst und im Browser ansiehst.",
      h1: "Spektrum-.TLM-Telemetriedateien öffnen",
      lead: "Ein Spektrum-Sender mit Telemetrie speichert deine Flüge als .TLM-Dateien. Hier steht, wo du sie findest, wie du sie auf den Computer kopierst und wie du sie ansiehst, ohne etwas zu installieren.",
      sections: [
        {
          h2: "Was eine .TLM-Datei ist",
          blocks: [
            { t: "p", text: "Eine .TLM-Datei ist ein binäres Telemetrie-Log, das der Sender schreibt. Sie speichert die Werte, die der Telemetrieempfänger und die Sensoren in deinem Modell während des Flugs gesendet haben: Qualität der Funkverbindung, Signalstärke, Empfängerspannung und je nach Ausstattung Motorstrom, Akkuzellen, Höhe, Steigrate, GPS-Position und mehr. Jedes Mal, wenn der Empfänger startet, beginnt in der Datei eine neue Sitzung." },
          ],
        },
        {
          h2: "Dateien von einem NX- oder iX-Sender holen",
          blocks: [
            { t: "ol", items: [
              "Schalte den Sender ein und verbinde ihn per USB-Kabel mit dem Computer.",
              "Wähle in den USB-Einstellungen des Senders die Option für den Zugriff auf den internen Speicher.",
              "Öffne das Laufwerk, das erscheint. Deine Logs sind `.TLM`-Dateien mit dem Modellnamen, dazu der Ordner `AutoLog`, in dem aktuelle Firmware für jede Flugsitzung automatisch ein Log schreibt.",
              "Kopiere die gewünschten Dateien auf deinen Computer.",
            ] },
            { t: "note", text: "Der Sender räumt seine automatischen Logs auf. Laut dem Änderungsprotokoll von Spektrum für NX behält er nur die neuesten Dateien. Kopiere ein Log deshalb bald nach dem Flug, wenn du es behalten willst." },
          ],
        },
        {
          h2: "Dateien von einem DX-Sender holen",
          blocks: [
            { t: "p", text: "DX-Sender mit Telemetrie-Logging speichern die Logs auf der SD-Karte. Achte darauf, dass das Logging in den Telemetrie-Einstellungen des Senders eingeschaltet ist, fliege, nimm dann die Karte heraus und kopiere die `.TLM`-Dateien auf deinen Computer. Wie die Menüs genau heißen, hängt vom Modell und von der Firmware-Version ab." },
          ],
        },
        {
          h2: "Die Dateien in TLMscope öffnen",
          blocks: [
            { t: "ol", items: [
              "Öffne [TLMscope](home) in einem aktuellen Browser.",
              "Lege eine oder mehrere `.TLM`-Dateien auf der Seite ab oder klicke, um sie auszuwählen.",
              "Wähle eine Sitzung in der Liste. Jeder Start des Empfängers ist eine Sitzung; Flüge, Bodentests und kurze Einschaltphasen sind gekennzeichnet.",
              "Nutze die Tabs für Höhe, Motor und Energie, Akku, Funkverbindung und das Modell. Mit „Details anzeigen“ siehst du die genauen Werte.",
            ] },
            { t: "p", text: "Große Logs mit vielen Flügen brauchen ein paar Sekunden zum Lesen. Alles geschieht auf deinem Gerät, nichts wird hochgeladen." },
          ],
        },
        {
          h2: "Wenn sich eine Datei nicht öffnen lässt",
          blocks: [
            { t: "ul", items: [
              "Prüfe, ob es eine Spektrum-Datei ist. EdgeTX, OpenTX und andere Funksysteme schreiben andere Log-Formate, die TLMscope noch nicht liest.",
              "Beschädigte Dateien werden so weit wie möglich gelesen: TLMscope überspringt kaputte Datensätze, zeigt eine Warnung und behält den Rest.",
              "Eine Sitzung ohne Höhensensor oder GPS lässt sich trotzdem öffnen; die Ansichten, die diese Daten brauchen, sagen dir, was fehlt.",
              "Dateien über 256 MB werden abgelehnt. Echte Logs haben ein paar MB.",
            ] },
          ],
        },
        {
          h2: "Erst ausprobieren?",
          blocks: [
            { t: "p", text: "Lade auf der [Startseite](home) den Demo-Flug: ein synthetischer Flug mit GPS und Thermik, der jede Ansicht zeigt." },
            { t: "p", text: "Was die Zahlen bedeuten, steht in [Spektrum-Telemetrie verstehen](page:understand). Die Liste der getesteten Sender findest du unter [Unterstützte Sender und Sensoren](page:radios)." },
          ],
        },
      ],
      faq: [
        {
          q: "Wo speichert ein Spektrum NX seine Telemetrie-Logs?",
          a: "Im internen Speicher: Logs mit dem Modellnamen als .TLM-Dateien und automatische Logs je Sitzung im Ordner AutoLog. Verbinde den Sender per USB und wähle die Option für den Zugriff auf den internen Speicher, um sie zu kopieren.",
        },
        {
          q: "Kann ich .TLM-Dateien auf dem Mac oder dem Handy öffnen?",
          a: "Ja. TLMscope läuft im Browser, deshalb funktioniert jeder aktuelle Browser unter macOS, Linux, Windows, Android oder iOS. Es muss nichts installiert werden.",
        },
        {
          q: "Wird meine .TLM-Datei hochgeladen, wenn ich sie in TLMscope öffne?",
          a: "Nein. Die Datei wird in deinem Browser gelesen und verlässt dein Gerät nicht.",
        },
      ],
    },

    understand: {
      title: "Spektrum-Telemetrie verstehen: Fades, Holds & Co.",
      description: "Was Frame Losses, Fades, Holds, Signalstärke, Empfängerspannung und Akkuwiderstand in der Spektrum-Telemetrie bedeuten und welche Werte wichtig sind.",
      h1: "Deine Spektrum-Telemetrie verstehen",
      lead: "Ein Telemetrie-Log ist voller Zähler und Spannungen. Diese Seite erklärt die wichtigen in einfachen Worten, zusammen mit den Faustregeln, nach denen TLMscope bewertet.",
      sections: [
        {
          h2: "Funkverbindung: Frame Losses, Fades und Holds",
          blocks: [
            { t: "p", text: "Der Empfänger zählt, was auf der Funkstrecke schiefgeht:" },
            { t: "ul", items: [
              "**Frame Losses** sind Datenpakete, die auf keiner Antenne angekommen sind. Ein paar sind normal. TLMscope bewertet bis etwa 20 pro Minute als hohe Qualität und bis etwa 100 pro Minute in der Luft als normal, in Übereinstimmung mit den Spektrum-Empfängerhandbüchern.",
              "**Fades** sind kurze Aussetzer auf einer einzelnen Antenne (A und B, bei Satellitenempfängern L und R). Der Zähler je Antenne zeigt, welche vom Rumpf abgeschattet wird.",
              "**Holds** sind etwa eine Sekunde ganz ohne Signal. Der Empfänger geht dann in seine Hold- oder Failsafe-Einstellung. Ein Hold im Flug wird immer als kritisch bewertet.",
            ] },
            { t: "note", text: "Diese Zähler beginnen bei null, wenn der Empfänger startet. TLMscope zeigt, was während der Sitzung passiert ist." },
          ],
        },
        {
          h2: "Signalstärke",
          blocks: [
            { t: "p", text: "Die Signalstärke am Empfänger wird in dBm angegeben: je näher an null, desto stärker. In den Beispielflügen von TLMscope stiegen die Frame Losses unterhalb von etwa −80 dBm stark an. Deshalb gelten −70 dBm oder besser als hoch, bis −80 dBm als normal, bis −85 dBm als schwach und alles darunter als kritisch." },
            { t: "p", text: "Der Tab Funkverbindung zeigt das Signal über der Höhe, weil Höhe und Entfernung oft zusammenhängen." },
          ],
        },
        {
          h2: "Empfängerspannung",
          blocks: [
            { t: "p", text: "Die Spannung am Empfänger sollte unter Last stabil bleiben. TLMscope bewertet 5,2 V oder mehr als stabil, 4,8 V oder mehr als OK, alles ab 4,0 V als Einbrüche und darunter als Ausfallgefahr. Achte auf Einbrüche, wenn sich mehrere Servos gleichzeitig bewegen. Das Handbuch des AR8360T verlangt, unter Last über 4,8 V zu bleiben, und Empfänger dieser Familie fallen unterhalb von etwa 3,5 V aus." },
          ],
        },
        {
          h2: "Akku: verbrauchte Ladung, Zellen und Innenwiderstand",
          blocks: [
            { t: "ul", items: [
              "**Verbrauchte Ladung** ist der Anteil der Akkukapazität, der in der Sitzung entnommen wurde. TLMscope bewertet bis 50 % als viel übrig, bis 70 % als gut, bis 80 % als bald landen und mehr als zu tief entladen: die gängige 80-%-Regel.",
              "**Zellspannungen** eines Spektrum Smart-Akkus zeigen die niedrigste und die höchste Zelle. Ein wachsender Unterschied zwischen den Zellen deutet auf einen unausgeglichenen Akku hin.",
              "**Innenwiderstand je Zelle** wird daraus geschätzt, wie weit die Spannung einbricht, wenn der Motor Strom zieht, und enthält deshalb die Verkabelung. Unter 10 mΩ je Zelle ist hervorragend, bis 12 mΩ akzeptabel, und über 15 mΩ ist es Zeit, den Akku auszumustern, eine Faustregel aus LiPo-Ratgebern. Die Seite Akkus verfolgt diesen Wert von Flug zu Flug und schätzt, wie viele Ladezyklen noch übrig sind.",
              "**Temperatur**: 35 bis 45 °C nach dem Flug sind normal. TLMscope warnt ab 45 °C und sieht 60 °C als übliche Obergrenze.",
            ] },
          ],
        },
        {
          h2: "Motor und Regler",
          blocks: [
            { t: "p", text: "Smart-Regler wie der Avian melden Motorstrom, Eingangsspannung, Gas, Drehzahl und Temperaturen. TLMscope nutzt sie, um die Motorläufe zu finden, die verbrauchte Ladung je Flugminute zu berechnen und den Höhengewinn je 100 mAh in Motorsteigflügen." },
          ],
        },
        {
          h2: "Höhe, Steigrate und Thermik",
          blocks: [
            { t: "p", text: "Ein Vario- oder Höhensensor meldet Höhe und Steigrate. TLMscope teilt einen Flug in Motorsteigflüge, Gleitflug und Aufwind: Steigen mit abgeschaltetem Motor von etwa zehn Sekunden oder länger wird als Aufwind markiert. Die Mittelpunkte der Thermik werden aus dem Kreisen geschätzt und auf der Karte angezeigt." },
          ],
        },
        {
          h2: "Belastungen und Drehraten",
          blocks: [
            { t: "p", text: "Empfänger mit AS3X oder SAFE melden Belastungen in g und Drehraten. TLMscope nutzt sie, um das Kreisen zu erkennen und zu beurteilen, wie sanft oder sportlich ein Flug war." },
          ],
        },
      ],
      faq: [
        {
          q: "Wie viele Frame Losses sind bei einem Spektrum-Empfänger normal?",
          a: "Die Spektrum-Empfängerhandbücher beschreiben bis etwa 100 pro Minute in der Luft als normal. TLMscope bewertet bis etwa 20 pro Minute als hohe Qualität. Holds, also etwa eine Sekunde ohne Signal, sollten nicht vorkommen.",
        },
        {
          q: "Was ist ein Hold in der Spektrum-Telemetrie?",
          a: "Ein Hold ist etwa eine Sekunde ganz ohne Signal am Empfänger. Der Empfänger geht dann in seine Hold- oder Failsafe-Einstellung. TLMscope bewertet einen Hold im Flug immer als kritisch.",
        },
        {
          q: "Wann sollte ich einen LiPo-Akku ausmustern?",
          a: "Eine gängige Faustregel lautet, einen Akku auszumustern, wenn sein Innenwiderstand etwa 15 mΩ je Zelle erreicht. TLMscope schätzt diesen Wert aus dem Spannungseinbruch im Flug und verfolgt ihn bei Spektrum Smart-Akkus über mehrere Flüge.",
        },
      ],
    },

    radios: {
      title: "Unterstützte Spektrum-Sender und Sensoren",
      description: "Welche Spektrum-Sender (NX, iX, DX) und Telemetrie-Sensoren TLMscope liest, welche Daten dafür nötig sind und was getestet ist.",
      h1: "Unterstützte Spektrum-Sender und Sensoren",
      lead: "TLMscope liest die .TLM-Telemetrie-Logs, die Spektrum-Sender speichern. Hier steht, was heute funktioniert, was getestet ist und was nicht abgedeckt wird.",
      sections: [
        {
          h2: "Sender",
          blocks: [
            { t: "table", head: ["Sender", "Wo die Logs liegen", "Status"], rows: [
              ["Spektrum NX6, NX8, NX10 (auch „+“-Versionen)", "Interner Speicher: `Modell.TLM` und Ordner `AutoLog`. Per USB kopieren.", "Getestet (NX8+)"],
              ["Spektrum iX12, iX14, iX20", "Interner Speicher, per USB kopieren.", "Getestet"],
              ["Spektrum DX6 G2/G3, DX7 G2, DX8 G2, DX9, DX10t, DX18 (ab G2), DX18t, DX20", "SD-Karte, wenn das Telemetrie-Logging eingeschaltet ist.", "Sollte funktionieren, noch nicht getestet"],
            ] },
            { t: "p", text: "Wo du die Dateien findest, steht in [Spektrum-.TLM-Dateien öffnen](page:open)." },
          ],
        },
        {
          h2: "Was du sehen kannst und was dafür nötig ist",
          blocks: [
            { t: "p", text: "Ein Log enthält nur, was die Sensoren im Modell gesendet haben. Fehlt Hardware, fehlen Daten. Das ist kein Fehler." },
            { t: "table", head: ["Daten", "Benötigt", "Status"], rows: [
              ["Funkverbindung: Frame Losses, Holds, Fades, Empfängerspannung, Signalstärke", "Jeder Spektrum-Telemetrieempfänger (Modellname endet auf „T“)", "Getestet"],
              ["Motor, Regler und BEC: Drehzahl, Strom, Spannung, Gas, Temperaturen", "Spektrum Smart-Regler (z. B. Avian)", "Getestet"],
              ["Akku: Zellspannungen, Temperatur, ID, Ladezyklen, Kapazität", "Spektrum Smart-Akku, über einen Smart-Regler angeschlossen", "Getestet"],
              ["Höhe und Steigrate", "Vario-/Höhensensor oder ein Empfänger, der sie meldet", "Getestet"],
              ["Belastungen (g) und Drehraten", "Empfänger mit AS3X / SAFE", "Getestet"],
              ["Gasknüppel-Stellung", "Aktuelle NX-Firmware (AutoLog-Dateien)", "Getestet"],
              ["Stabilisierungsmodus", "Empfänger mit AS3X / SAFE", "Teilweise verstanden"],
              ["Karte, Entfernung, Geschwindigkeit über Grund", "Spektrum-GPS-Telemetriesensor", "Mit einem echten GPS-Log getestet"],
              ["Andere Sensoren (Fahrtmesser, zusätzliche Strom- oder Temperatursensoren, …)", "X-Bus-/SRXL2-Sensoren", "Vorerst als Rohdaten angezeigt"],
            ] },
          ],
        },
        {
          h2: "Nicht unterstützt",
          blocks: [
            { t: "ul", items: [
              "EdgeTX-/OpenTX-Logs (CSV, zum Beispiel RadioMaster, FrSky, ExpressLRS, Crossfire): geplant, noch nicht verfügbar.",
              "Andere Funksysteme mit eigenen Log-Formaten (Jeti, Graupner HoTT, Futaba, Multiplex …).",
              "Logs von Flugsteuerungen (ArduPilot, Betaflight Blackbox, iNav).",
              "Spektrum-Sender, die keine Telemetrie-Logs speichern können (zum Beispiel die DX6i).",
              "Live-Telemetrie während des Flugs. TLMscope arbeitet mit den gespeicherten Dateien danach.",
              "Autos und Boote (Spektrum-Bodenfunken) sind kein Schwerpunkt. Ihre Logs funktionieren teilweise.",
            ] },
          ],
        },
        {
          h2: "Hilf mit, die Unterstützung zu erweitern",
          blocks: [
            { t: "p", text: "Bisher sind Logs von NX- und iX-Sendern getestet. Wenn du einen DX-Sender oder andere Spektrum-Sensoren fliegst, hilft eine Logdatei sehr, um die Dekodierung zu prüfen und zu erweitern. Sag Bescheid über den Knopf **Feedback** in TLMscope (siehe [Wie schicke ich Feedback oder ein Log?](page:faq#feedback-senden)) oder eröffne ein Issue im [GitHub-Projekt](https://github.com/andreasknoor/tlmscope). Teile nur Logs, bei denen du dich wohlfühlst: Logs mit GPS zeigen, wo du fliegst." },
            { t: "p", text: "TLMscope ist ein unabhängiges Projekt und wird nicht von Spektrum oder Horizon Hobby hergestellt oder unterstützt." },
          ],
        },
      ],
    },

    help: {
      title: "TLMscope Hilfe: So liest du deine Flugansichten",
      description: "Rundgang durch TLMscope: Übersicht, Höhe und Aufwind, Flugweg mit 3D-Wiedergabe, Motor und Energie, Akku, Funkverbindung sowie Akkus und Dateninventar.",
      h1: "TLMscope Hilfe",
      lead: "Ein kurzer Rundgang: Was jede Ansicht zeigt und wie du das Meiste daraus holst.",
      sections: [
        {
          h2: "Erste Schritte",
          blocks: [
            { t: "ol", items: [
              "Lege eine oder mehrere `.TLM`-Dateien auf der Startseite ab oder klicke, um sie auszuwählen. Du kannst jederzeit weitere Dateien hinzufügen.",
              "Wähle links in der Liste eine Sitzung. Auf dem Handy ist die Liste eine Auswahl oben. Jeder Start des Empfängers ist eine Sitzung.",
              "„Flüge“ zeigt nur echte Flüge, „Alle“ auch Bodentests und kurze Einschaltphasen. Sind mehrere Modelle geladen, kannst du die Liste auf ein Modell beschränken.",
            ] },
            { t: "img", name: "overview", alt: "TLMscope-Übersicht eines Demo-Flugs: Zusammenfassung, Kennzahlen und Höhenprofil mit Motorsteigflügen, Aufwind und Gleitflug", caption: "Die Übersicht eines Flugs: Zusammenfassung, Kennzahlen und Höhenprofil." },
          ],
        },
        {
          h2: "Einfache Ansicht und Details",
          blocks: [
            { t: "p", text: "Standardmäßig siehst du verständliche Zusammenfassungen und Bewertungen in vier Stufen, zum Beispiel Kritisch, Schwach, Normal und Hoch. Mit „Details anzeigen“ oben rechts siehst du die genauen Werte, mehr Diagramme und die Grenzen hinter jeder Bewertung. Die Gründe für die Grenzen erklärt [Deine Spektrum-Telemetrie verstehen](page:understand)." },
          ],
        },
        {
          h2: "Die Tabs einer Sitzung",
          blocks: [
            { t: "ul", items: [
              "**Übersicht**: ein Zusammenfassungssatz, Kennzahlen, das Höhenprofil mit Motorsteigflügen, Gleitflug und Aufwind sowie der Bereich „Zustand“ mit den Bewertungen.",
              "**Höhe & Aufwind**: Steigflüge, gefundener Aufwind und der Gleitflug.",
              "**Flugweg**: der Weg auf der Karte und in 3D mit Wiedergabe (mit GPS-Sensor).",
              "**Motor & Energie**: Motorläufe, Strom, verbrauchte Ladung und die Steigeffizienz.",
              "**Akku**: Ladestand, Zellspannungen und der Spannungseinbruch, aus dem sich der Innenwiderstand ergibt.",
              "**Funkverbindung**: Signalstärke, Frame Losses und Holds im Zeitverlauf sowie das Signal über der Höhe.",
              "**Modell**: Temperaturen, Empfänger- und BEC-Spannung, Belastungen und der Stabilisierungsmodus.",
              "**Rohdaten**: alle dekodierten Sensordatenströme, sichtbar mit „Details anzeigen“.",
            ] },
          ],
        },
        {
          h2: "Flugweg und Wiedergabe",
          blocks: [
            { t: "p", text: "Mit einem GPS-Sensor wird der Flugweg auf einer Karte in 3D gezeigt. Halte die rechte Maustaste gedrückt und bewege die Maus nach oben oder unten, um die Ansicht zu kippen. Die Wiedergabe spielt den Flug mit bis zu 60-facher Geschwindigkeit ab; die Modellmarkierung, jedes Diagramm und auf Wunsch ein Vario-Ton laufen mit. Die Leertaste startet und stoppt sie, und der Vollbildmodus gibt der Karte mehr Platz. In den Kartenwerkzeugen wählst du die Linienart, das Modell in der Wiedergabe und einen Bodenschatten." },
            { t: "img", name: "path", alt: "Der Flugweg eines Demo-Flugs in 3D auf einer Karte, eingefärbt nach Motorsteigflug, Gleitflug und Thermik, darunter die Wiedergabe", caption: "Der Flugweg in 3D, nach Phase eingefärbt, mit der Wiedergabe darunter." },
          ],
        },
        {
          h2: "Akkus und Dateninventar",
          blocks: [
            { t: "ul", items: [
              "**Akkus** gruppiert die Flüge nach Spektrum Smart-Akku. Jeder Akku zeigt seine Ladezyklen, seinen Zustand, einen Verlauf des Innenwiderstands und eine Schätzung der verbleibenden Zyklen. Die Sitzungsliste eines Akkus klappt mit einem Klick auf.",
              "**Dateninventar** listet alles auf, was in den geladenen Dateien steckt, auch die Teile, die noch nicht verstanden sind.",
            ] },
          ],
        },
        {
          h2: "Tasten, Sprache und Datenschutz",
          blocks: [
            { t: "ul", items: [
              "Pfeil links und rechts wechseln zur älteren oder neueren Sitzung; Pfeil hoch und runter bewegen sich durch die Liste, solange sie den Fokus hat.",
              "Die Leertaste startet und stoppt die Wiedergabe; Esc schließt den Vollbildmodus.",
              "EN und DE oben rechts schalten die Sprache um.",
              "Dateien werden in deinem Browser gelesen und nie hochgeladen. Nur die Karte lädt Kartenbilder von OpenFreeMap.",
            ] },
          ],
        },
      ],
    },

    faq: {
      title: "TLMscope FAQ: Spektrum-TLM-Dateien, Datenschutz, Mac",
      description: "Antworten auf häufige Fragen zu Spektrum-.TLM-Dateien, zum Öffnen auf Mac, Linux und Handy, zu Datenschutz, unterstützten Sendern, Frame Losses und Akkualter.",
      h1: "Häufige Fragen",
      lead: "Kurze Antworten zum Öffnen von Spektrum-Telemetrie-Logs und zum Lesen in TLMscope. Jede Antwort verweist auf die Seite mit den Einzelheiten.",
      sections: [],
      faq: [
        { q: "Was ist TLMscope?", a: [
          { t: "p", text: "TLMscope ist ein kostenloser Viewer und Analysewerkzeug für Spektrum-.TLM-Telemetrie-Logs, direkt im Browser. Es läuft unter Windows, macOS, Linux, Android und iOS ohne Installation, und die Dateien bleiben auf deinem Gerät." },
          { t: "p", text: "Aus einem Log zeigt es:" },
          { t: "ul", items: ["eine verständliche Zusammenfassung jedes Flugs", "Diagramme zu Höhe, Steigen, Motor, Akku und Funkverbindung", "eine GPS-Karte mit 3D-Wiedergabe", "Thermik", "den Akkuzustand über mehrere Flüge"] },
        ] },
        { q: "Was ist eine Spektrum-.TLM-Datei?", a: "Eine .TLM-Datei ist das Telemetrie-Log, das ein Spektrum-Sender während des Flugs speichert. Sie enthält, was der Empfänger und die Sensoren im Modell gemeldet haben, zum Beispiel Signalstärke, Akkuspannung, Motorstrom, Höhe und GPS-Position. Siehe [Spektrum-.TLM-Dateien öffnen](page:open)." },
        { q: "Wie öffne ich eine .TLM-Datei?", a: [
          { t: "ol", items: ["Kopiere die .TLM-Datei vom Sender auf deinen Computer oder dein Handy.", "Lege sie auf der Startseite ab oder klicke, um sie auszuwählen.", "TLMscope liest sie in deinem Browser und zeigt eine Zusammenfassung jedes Flugs."] },
          { t: "p", text: "Gerade kein Log zur Hand? Lade den Demo-Flug. Die [Schritt-für-Schritt-Anleitung](page:open) zeigt, wo die Dateien bei NX-, iX- und DX-Sendern liegen." },
        ] },
        { q: "Wo speichert ein Spektrum NX seine Telemetrie-Logs?", a: [
          { t: "p", text: "Im internen Speicher:" },
          { t: "ul", items: ["Logs mit dem Modellnamen, als .TLM-Dateien", "automatische Logs je Sitzung, im Ordner **AutoLog**"] },
          { t: "p", text: "Verbinde den Sender per USB und wähle die Option für den Zugriff auf den internen Speicher, um sie zu kopieren." },
        ] },
        { q: "Gibt es einen Spektrum-TLM-Viewer für Mac, Linux oder Handy?", a: "Ja. TLMscope ist eine Webseite und läuft in einem aktuellen Browser unter Windows, macOS, Linux, Android und iOS. Es muss nichts installiert werden. Karte und 3D-Wiedergabe nutzen WebGL, das aktuelle Browser unterstützen." },
        { q: "Werden meine Flug-Logs irgendwo hochgeladen?", a: [
          { t: "p", text: "Nein. Die Dateien werden in deinem Browser gelesen und verlassen dein Gerät nicht." },
          { t: "p", text: "Nur bei Logs mit GPS lädt die Karte Kartenbilder von OpenFreeMap, das dadurch ungefähr sieht, wo du geflogen bist. Siehe [Datenschutzerklärung](legal)." },
        ] },
        { q: "Funktioniert TLMscope ohne Internet?", a: [
          { t: "p", text: "Ja, nach einem Besuch mit Internet:" },
          { t: "ol", items: ["Öffne TLMscope einmal mit Internet.", "Warte, bis unten **Funktioniert offline** steht.", "Ab dann öffnet es sich auch ohne Verbindung, zum Beispiel auf dem Flugplatz."] },
          { t: "p", text: "Auf iPhone und iPad füge TLMscope zum Home-Bildschirm hinzu, damit Safari es behält. Nur die Karte im Tab „Flugweg“ braucht Internet." },
        ] },
        { id: "app-installieren", q: "Wie installiere ich TLMscope auf Handy oder Laptop?", a: [
          { t: "p", text: "TLMscope läuft im Browser, deshalb gibt es nichts aus einem App Store zu laden. Du kannst es trotzdem wie eine App hinzufügen:" },
          { t: "ul", items: [
            "**Android (Chrome):** TLMscope öffnen, auf das Menü ⋮ tippen und **App installieren** oder **Zum Startbildschirm hinzufügen** wählen.",
            "**iPhone und iPad (Safari):** auf **Teilen** tippen, dann **Zum Home-Bildschirm**. So bleibt auch die Offline-Kopie erhalten, die Safari sonst nach einigen Tagen ohne Nutzung löscht.",
            "**Laptop mit Chrome oder Edge:** auf das Installieren-Symbol rechts in der Adressleiste klicken.",
            "**Mac mit Safari:** **Ablage → Zum Dock hinzufügen** wählen.",
            "**Firefox:** Ein Lesezeichen reicht.",
          ] },
          { t: "p", text: "Öffne TLMscope danach einmal mit Internet und warte, bis unten **Funktioniert offline** steht. Ab dann öffnet es sich auch ohne Verbindung, nur die Karte braucht Internet." },
          { t: "p", text: "Deine Log-Dateien werden nie hochgeladen oder gespeichert." },
        ] },
        { id: "feedback-senden", q: "Wie schicke ich Feedback oder ein Log?", a: [
          { t: "p", text: "Nutze den Knopf **Feedback** oben in TLMscope oder die kleinen Links unter den Bewertungen, am Ende jedes Tabs und auf der Startseite:" },
          { t: "ol", items: ["Öffne den Feedback-Dialog und prüfe die technischen Angaben, die mitgesendet würden. Du kannst sie abschalten.", "Wähle **Weiter zum Formular**, suche die Art der Nachricht aus und schreibe sie auf.", "Gib deine E-Mail-Adresse nur an, wenn du eine Antwort möchtest."] },
          { t: "p", text: "Das Formular stellt Tally (Belgien) bereit und lädt erst, nachdem du fortgefahren bist. Logdateien, Dateinamen, Modellnamen, Positionen und Flugwerte werden nie gesendet. Brauche ich ein Log, frage ich in meiner Antwort danach, und du kannst es per E-Mail schicken. Logs mit GPS zeigen, wo du fliegst, teile also nur, womit du dich wohlfühlst." },
        ] },
        { q: "Welche Sender und Sensoren werden unterstützt?", a: "Logs von Spektrum-NX- und iX-Sendern sind getestet. DX-Logs sollten funktionieren, sind aber noch nicht getestet. Funkverbindung, Motor, Akku, Höhe, GPS und mehr erscheinen je nachdem, welche Sensoren dein Modell hat. Siehe [Unterstützte Sender und Sensoren](page:radios)." },
        { q: "Wie viele Frame Losses sind bei einem Spektrum-Empfänger normal?", a: [
          { t: "ul", items: ["**Normal:** Die Spektrum-Empfängerhandbücher beschreiben bis etwa 100 pro Minute in der Luft als normal.", "**Hohe Qualität:** TLMscope bewertet bis etwa 20 pro Minute als hohe Qualität.", "**Holds**, also etwa eine Sekunde ohne Signal, sollten nicht vorkommen."] },
          { t: "p", text: "Mehr in [Deine Spektrum-Telemetrie verstehen](page:understand)." },
        ] },
        { q: "Was ist ein Hold in der Spektrum-Telemetrie?", a: "Ein Hold ist etwa eine Sekunde ganz ohne Signal am Empfänger. Der Empfänger geht dann in seine Hold- oder Failsafe-Einstellung. TLMscope bewertet einen Hold im Flug immer als kritisch." },
        { q: "Wann sollte ich einen LiPo-Akku ausmustern?", a: "Eine gängige Faustregel lautet, einen Akku auszumustern, wenn sein Innenwiderstand etwa 15 mΩ je Zelle erreicht. TLMscope schätzt diesen Wert aus dem Spannungseinbruch im Flug und verfolgt ihn bei Spektrum Smart-Akkus über mehrere Flüge." },
        { q: "Ist TLMscope kostenlos, und stammt es von Spektrum?", a: "TLMscope ist kostenlos, braucht kein Konto und ist ein unabhängiges Hobbyprojekt eines Modellfliegers. Es wird nicht von Spektrum oder Horizon Hobby hergestellt oder unterstützt. Wie es sich zu anderen Viewern verhält, steht in [Spektrum-TLM-Viewer im Vergleich](page:compare)." },
        { q: "Gibt es eine Alternative zu TLM Viewer?", a: [
          { t: "p", text: "Ja. Die wichtigsten Möglichkeiten:" },
          { t: "ul", items: ["**TLM Viewer:** ein bewährtes, quelloffenes Windows-Programm mit Export nach CSV und KML.", "**TLMscope:** kostenlos, läuft im Browser auf jedem Gerät und erklärt jeden Flug in einfachen Worten.", "**Log Explorer:** ein kostenpflichtiges Desktop-Programm, das auch andere Fernsteuersysteme liest."] },
          { t: "p", text: "Siehe [Spektrum-TLM-Viewer im Vergleich](page:compare)." },
        ] },
      ],
    },

    compare: {
      title: "Spektrum TLM Viewer im Vergleich: Browser oder Desktop",
      description: "TLMscope im Browser im Vergleich mit TLM Viewer und Log Explorer für Spektrum-Logs: Plattformen, Preis, Funktionen, Einsatz.",
      h1: "Spektrum-TLM-Viewer im Vergleich",
      lead: "Es gibt mehrere Wege, ein Spektrum-Telemetrie-Log anzusehen. Das ist ein fairer Überblick mit den Stärken jeder Möglichkeit. Angaben zu anderen Werkzeugen stammen von deren eigenen Produktseiten und Versionshinweisen, Stand November 2026, und können sich ändern. Die anderen Programme haben wir nicht selbst installiert und getestet.",
      sections: [
        {
          h2: "Die Möglichkeiten",
          blocks: [
            { t: "table", head: ["Möglichkeit", "Wie es läuft", "Plattformen", "Gut zu wissen"], rows: [
              ["**TLMscope**", "Im Browser, nichts zu installieren", "Jeder aktuelle Browser: Windows, macOS, Linux, Android, iOS", "Kostenlos, kein Konto, die Dateien bleiben auf deinem Gerät. Deutsch und Englisch. Verständliche Zusammenfassungen und Bewertungen, Diagramme, GPS-Karte mit 3D-Wiedergabe, Akku-Alterung über mehrere Flüge. Liest nur Spektrum-Logs. Kein Export."],
              ["**[TLM Viewer](https://www.tlmviewer.com)**", "Desktop-Programm zum Herunterladen", "Windows; auf dem Mac nur über einen Windows-Emulator, nicht auf Android, laut seiner Dokumentation", "Ein langjähriges kostenloses Werkzeug, seit August 2026 Open Source (AGPLv3) mit [Quellcode auf GitHub](https://github.com/DroneTales/TLMViewer). Diagramme, Rohdaten der Sensoren, Bearbeiten von Sitzungen, Export als CSV, KML (Google Earth) und TLM. Liest alte und beschädigte Log-Formate und viele weitere Sensoren, zum Beispiel Turbinen, Verbrenner, PowerBox und Crossfire. Nur auf Englisch."],
              ["**[Log Explorer](https://phaedradg.itch.io/ethos-log-explorer)**", "Desktop-Programm für Windows, kostenpflichtig, mit Android-Begleit-App", "Windows und Android; macOS und Linux nennt die Produktseite", "Ab 10 $ (zahle, was du willst), mit einem Lizenzschlüssel, der an die Windows-Hardware-ID gebunden ist. Liest FrSky-Ethos- und OpenTX-Logs und laut Versionshinweisen seit v3.0 auch Spektrum- und Jeti-Logs. Führt eine Bibliothek je Modell mit Notizen und Tags, vergleicht Flüge, verfolgt den Akku-Innenwiderstand über die Zeit, verknüpft Videodateien und exportiert ein Overlay-Video mit Transparenz. Außerdem Kostenverwaltung, Wetter und Modelldateien, was nicht zu TLMscope gehört."],
              ["Code-Bibliotheken und kleine Projekte", "Code für Entwickler", "Unterschiedlich", "Zum Beispiel ein Ruby-Paket und ein Android-Reader auf GitHub. Nützlich, um eigene Werkzeuge zu bauen; das Android-Projekt beschreibt sich selbst als in früher Entwicklung."],
            ] },
          ],
        },
        {
          h2: "Wann was passt",
          blocks: [
            { t: "ul", items: [
              "Nimm **TLMscope**, wenn du schnell eine verständliche Antwort auf „Was ist in diesem Flug passiert?“ willst, auf jedem Gerät, ohne etwas zu installieren oder Daten hochzuladen.",
              "Nimm **TLM Viewer**, wenn du unter Windows arbeitest und Daten exportieren (CSV, KML) oder Logs bearbeiten und wieder speichern willst.",
              "Nimm **Log Explorer**, wenn du mehrere Funksysteme fliegst, eine Bibliothek mit Flügen je Modell und Notizen führen, Flüge nebeneinander vergleichen oder Overlay-Videos machen willst. Preis und Windows-Lizenz sind die Kosten.",
              "Nutze beide: Sie lesen dieselben Dateien. Beides sind unabhängige Projekte; keines stammt von Spektrum.",
            ] },
          ],
        },
        {
          h2: "Was TLMscope anders macht",
          blocks: [
            { t: "ul", items: [
              "Es läuft im Browser auf jedem Computer und auf Handys, ohne Installation.",
              "Es erklärt Flüge in einfacher Sprache und bewertet sie in vier Stufen, die genauen Werte sind einen Klick entfernt.",
              "Es verfolgt jeden Smart-Akku über mehrere Flüge und schätzt seine Restlebensdauer.",
              "Es findet Thermik und zeigt sie auf der Karte und in der Wiedergabe.",
              "Es spricht Deutsch und Englisch, und sein Quellcode ist auf GitHub unter der MIT-Lizenz öffentlich.",
            ] },
          ],
        },
        {
          h2: "Die ehrlichen Grenzen von TLMscope",
          blocks: [
            { t: "ul", items: [
              "Bisher sind nur Logs von NX- und iX-Sendern getestet. Siehe [Unterstützte Sender und Sensoren](page:radios).",
              "Einen Export als CSV oder KML gibt es noch nicht.",
              "Es gibt keinen Flugvergleich, keine Bibliothek über mehrere Besuche hinweg und keine Notizen oder Tags. Log Explorer hat all das.",
              "Log Explorer liest mehr Funksysteme. Seine Spektrum-Unterstützung ist neuer als die für FrSky, und wir haben beide Programme nicht mit derselben Logdatei verglichen.",
              "Es liest nur Spektrum-Logs; EdgeTX-Logs sind geplant.",
            ] },
          ],
        },
      ],
      faq: [
        { q: "Welcher Viewer ist der beste für Spektrum-TLM-Dateien?", a: [
          { t: "p", text: "Das hängt davon ab, was du brauchst:" },
          { t: "ul", items: ["**TLMscope** ist der schnellste Weg, einen Flug auf jedem Gerät zu verstehen, im Browser und ohne Installation.", "**TLM Viewer** passt zu Windows-Nutzern, die Daten nach CSV oder Google Earth exportieren wollen.", "**Log Explorer** passt zu Piloten, die mehrere Fernsteuersysteme fliegen und eine Flugbibliothek möchten."] },
        ] },
        { q: "Kann ich Spektrum-TLM-Dateien online ansehen?", a: "Ja. TLMscope ist ein Online-TLM-Viewer: Seite öffnen, .TLM-Datei ablegen, und die Flüge erscheinen. Die Datei wird in deinem Browser gelesen und nicht auf einen Server hochgeladen." },
        { q: "Läuft TLM Viewer auf dem Mac?", a: "Laut seiner Dokumentation ist TLM Viewer ein Windows-Programm, das auf dem Mac nur über einen Windows-Emulator läuft. TLMscope läuft auf dem Mac direkt in Safari, Chrome oder Firefox." },
      ],
    },
  },
};
