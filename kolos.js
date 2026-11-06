"use strict";

/* ================= Kolos (zadania z arkusza) ================= */

/* --- Dane zadań: odtworzone z arkusza, odpowiedzi sprawdzone niezależnie od notatek ręcznych. --- */

const KOLOS_A1 = [
  { s: "Die Lieferung kam an, aber das Paket war ganz ___.", hint: "rissezern", a: "zerrissen", opts: ["zerrissen", "zerbrochen", "versalzen", "verbogen"],
    why: "zerrissen = rozdarty, podarty (od zerreißen). Karton i papier się drą. zerbrochen = stłuczony (szkło), versalzen = przesolony, verbogen = wygięty." },
  { s: "Das Display des Handys ist ___.", hint: "schäbedigt", a: "beschädigt", opts: ["beschädigt", "zerrissen", "versalzen", "nicht aufgeräumt"],
    why: "beschädigt = uszkodzony – ogólne słowo na uszkodzoną rzecz. Litery (schäbedigt) układają się w „beschädigt”." },
  { s: "Der Wasserkocher funktioniert nicht. Er scheint ___ zu sein.", hint: "fektde", a: "defekt", opts: ["defekt", "zerrissen", "versalzen", "zerkratzt"],
    why: "defekt = zepsuty, wadliwy – urządzenie nie działa. zerkratzt = porysowany (ale może działać), zerrissen = rozdarty." },
  { s: "Beim Transport ist die Glastür ___.", hint: "enbrochzer", a: "zerbrochen", opts: ["zerbrochen", "zerrissen", "versalzen", "verbogen"],
    why: "zerbrochen = rozbity, stłuczony – tak mówimy o szkle (Glastür). zerrissen pasuje do papieru i materiału." },
];

const KOLOS_A2 = [
  { n: "Protokoll", v: "führen", pl: "prowadzić protokół", ex: "In Meetings führe ich das Protokoll." },
  { n: "zur Sprache", v: "kommen", pl: "zostać poruszonym (o temacie)", ex: "In der Besprechung kam das Problem zur Sprache." },
  { n: "Vereinbarungen", v: "treffen", pl: "zawierać porozumienia, ustalać", ex: "Wir haben klare Vereinbarungen getroffen." },
  { n: "die Gelegenheit", v: "ergreifen", pl: "skorzystać z okazji", ex: "Ich ergreife die Gelegenheit, Fragen zu stellen." },
  { n: "zur Diskussion", v: "stellen", pl: "poddać pod dyskusję", ex: "Der Chef stellt den Vorschlag zur Diskussion." },
  { n: "Aufgaben", v: "erfüllen", pl: "wykonywać zadania", ex: "Sie erfüllt ihre Aufgaben zuverlässig." },
];
const KOLOS_A2_VERBS = ["kommen", "erfüllen", "ergreifen", "führen", "treffen", "stellen"];
const KOLOS_A2_NOTE = "„Aufgaben stellen” też istnieje (zadawać zadania), ale „stellen” jest potrzebne do „zur Diskussion stellen”, więc dla „Aufgaben” zostaje „erfüllen”.";

const KOLOS_A3 = [
  { s: "Die Lampe hat nur 50 Euro gekostet! Sie war sehr ___.", opts: ["hübsch", "modern", "günstig", "haltbar"], a: "günstig",
    why: "„nur 50 Euro” → chodzi o cenę: günstig = tani, korzystny. hübsch (ładny), modern (nowoczesny), haltbar (trwały) nie mówią nic o cenie." },
  { s: "Das Material besteht fast nur aus Plastik. Es ist nicht sehr ___.", opts: ["benutzerfreundlich", "effizient", "umweltfreundlich", "zuverlässig"], a: "umweltfreundlich",
    why: "Plastik szkodzi środowisku → nicht umweltfreundlich (nieprzyjazny środowisku). benutzerfreundlich = łatwy w obsłudze, effizient = wydajny, zuverlässig = niezawodny." },
  { s: "Ich möchte, dass ein Produkt gut aussieht. Als Grafikerin ist mir ___ wichtig.", opts: ["Design", "Preis", "Qualität", "Service"], a: "Design",
    why: "„gut aussieht” (dobrze wygląda) + graficzka → liczy się wygląd: das Design." },
  { s: "Mein alter Laptop funktioniert einwandfrei. Er ist absolut ___.", opts: ["zuverlässig", "attraktiv", "hübsch", "günstig"], a: "zuverlässig",
    why: "einwandfrei funktionieren = działać bez zarzutu → zuverlässig (niezawodny). attraktiv i hübsch dotyczą wyglądu, günstig – ceny." },
  { s: "Wie findest du das neue Computerprogramm? Toll! Es ist sehr ___.", opts: ["bio", "benutzerfreundlich", "nachhaltig", "haltbar"], a: "benutzerfreundlich",
    why: "Program komputerowy chwalimy za łatwą obsługę: benutzerfreundlich. bio (żywność ekologiczna), nachhaltig (zrównoważony), haltbar (trwały – o rzeczach) nie pasują do programu." },
  { s: "In unserem Unternehmen setzen wir uns für Nachhaltigkeit ein. Deshalb sind auch unsere Verpackungen ___.", opts: ["preiswert", "umweltfreundlich", "effizient", "attraktiv"], a: "umweltfreundlich",
    why: "Nachhaltigkeit (zrównoważony rozwój) → opakowania przyjazne środowisku: umweltfreundlich. preiswert = tanie – nie wynika z „Nachhaltigkeit”." },
];

const KOLOS_A4 = [
  { s: "Maja fährt jeden Tag in die Stadt, ___ an dem Englisch-Sprachkurs ___.",
    opts: ["um … teilzunehmen", "damit sie … teilnehmen kann", "um … teilnehmen kann", "damit sie … teilzunehmen"], a: "um … teilzunehmen",
    full: "Maja fährt jeden Tag in die Stadt, um an dem Englisch-Sprachkurs teilzunehmen.",
    why: "Ten sam podmiot (Maja = sie) → um … zu: um … teilzunehmen (teilnehmen jest rozdzielny, więc zu w środku).",
    no: { "damit sie … teilnehmen kann": "Gramatycznie to zdanie jest poprawne, ale podmiot jest ten sam (Maja = sie), więc w zadaniu oczekiwane jest krótsze um … zu.", "um … teilnehmen kann": "Po um musi być zu + bezokolicznik na końcu, a nie odmieniony czasownik.", "damit sie … teilzunehmen": "damit nigdy nie łączy się z zu – po damit stoi odmieniony czasownik (teilnehmen kann)." } },
  { s: "Majas Mann kommt jeden Tag früher von der Arbeit nach Hause, ___ seine Frau an dem Englisch-Sprachkurs ___.",
    opts: ["damit … teilnehmen kann", "um … teilnehmen zu können", "um … teilnehmen kann", "damit … teilnehmen zu können"], a: "damit … teilnehmen kann",
    full: "Majas Mann kommt jeden Tag früher von der Arbeit nach Hause, damit seine Frau an dem Englisch-Sprachkurs teilnehmen kann.",
    why: "Różne podmioty (der Mann / seine Frau) → damit + odmieniony czasownik na końcu: damit seine Frau … teilnehmen kann.",
    no: { "um … teilnehmen zu können": "um … zu wymaga tego samego podmiotu, a tu przychodzi mąż, a na kurs idzie żona.", "um … teilnehmen kann": "Po um nie ma odmienionego czasownika i podmiotu – a podmioty są tu różne, więc tylko damit.", "damit … teilnehmen zu können": "damit nigdy nie łączy się z zu." } },
  { s: "___ das Sprachdiplom an der VHS ___, muss ich heute Abend noch Vokabeln lernen.",
    opts: ["Um … zu bekommen", "Damit ich … bekomme", "Um … bekomme", "Damit ich … zu bekommen"], a: "Um … zu bekommen",
    full: "Um das Sprachdiplom an der VHS zu bekommen, muss ich heute Abend noch Vokabeln lernen.",
    why: "Ten sam podmiot (ich dostaję dyplom, ich się uczę) → Um … zu bekommen. Zdanie podrzędne stoi na początku, więc potem od razu czasownik: muss ich.",
    no: { "Damit ich … bekomme": "Gramatycznie możliwe, ale przy tym samym podmiocie (ich – ich) oczekiwane jest um … zu.", "Um … bekomme": "Po um musi być zu + bezokolicznik.", "Damit ich … zu bekommen": "damit nigdy nie łączy się z zu." } },
  { s: "Ich habe das Modul „Präsentationstechniken” belegt, ___ ich nicht so unsicher ___, wenn ich vor Publikum spreche.",
    opts: ["damit … bin", "um … zu sein", "um … bin", "damit … zu sein"], a: "damit … bin",
    full: "Ich habe das Modul „Präsentationstechniken” belegt, damit ich nicht so unsicher bin, wenn ich vor Publikum spreche.",
    why: "W zdaniu jest już wydrukowane „ich” – po um nie może stać podmiot, więc jedyna poprawna opcja to damit ich … bin. (Bez „ich” byłoby też dobrze: „um nicht so unsicher zu sein”.)",
    no: { "um … zu sein": "„um ich nicht so unsicher zu sein” jest błędne – po um nie stawiamy podmiotu, a „ich” jest w zdaniu na stałe. Poprawnie: damit ich … bin (albo bez ich: um nicht so unsicher zu sein).", "um … bin": "Po um musi być zu + bezokolicznik, a nie odmieniony czasownik.", "damit … zu sein": "damit nigdy nie łączy się z zu." } },
  { s: "Frau Rigler bietet ihre Schulung in Haus 1 an, ___ die Mitarbeiter in der Kantine zu Mittag ___.",
    opts: ["damit … essen können", "um … zu essen", "um … essen können", "damit … zu essen"], a: "damit … essen können",
    full: "Frau Rigler bietet ihre Schulung in Haus 1 an, damit die Mitarbeiter in der Kantine zu Mittag essen können.",
    why: "Różne podmioty (Frau Rigler / die Mitarbeiter) → damit + odmieniony czasownik: damit die Mitarbeiter … essen können. „zu Mittag essen” = jeść obiad – to „zu” nie jest zu przed bezokolicznikiem.",
    no: { "um … zu essen": "um … zu wymaga tego samego podmiotu, a szkolenie prowadzi Frau Rigler, a jedzą pracownicy.", "um … essen können": "Po um musi być zu + bezokolicznik.", "damit … zu essen": "damit nigdy nie łączy się z zu." } },
];

const KOLOS_A5 = [
  { s: "Mein Chef möchte, dass ich eine ___ aller vorhandenen Waren im Lager mache.", opts: ["Bestandsaufnahme", "Bestandsabnahme", "Bestandsbewertung"], a: "Bestandsaufnahme",
    why: "eine Bestandsaufnahme machen = zrobić inwentaryzację (policzyć towary w magazynie). Bestandsbewertung to wycena zapasów (księgowość), a „Bestandsabnahme” to spadek zapasów – nie robi się ich „machen”." },
  { s: "Ich soll prüfen, ob die ___ ausreicht.", opts: ["Lagerkapazität", "Verfügung", "Globalisierung"], a: "Lagerkapazität",
    why: "Lagerkapazität = pojemność magazynu – może „wystarczać” (ausreichen). Verfügung występuje tylko w „zur Verfügung stehen”." },
  { s: "Außerdem möchte er wissen, welche Materialien wir noch dringend ___ müssen.", opts: ["beschaffen", "anbieten", "bestimmen"], a: "beschaffen",
    why: "Materialien beschaffen = pozyskać, zakupić materiały (zaopatrzenie). anbieten = oferować (robi to dostawca), bestimmen = ustalać." },
  { s: "Pinsel und Farben brauchen wir nicht zu bestellen. Das ist nicht ___.", opts: ["erforderlich", "geeignet", "global"], a: "erforderlich",
    why: "nicht erforderlich = niekonieczne, niepotrzebne – pasuje do „nie musimy zamawiać”. geeignet = odpowiedni, global = globalny." },
  { s: "Aber die ___ müssen wir auf jeden Fall nachbestellen, denn die ___ ist bei der Kundschaft im Moment sehr groß.",
    opts: ["Gartengeräte … Nachfrage", "Menge … Nachfrage", "Gartengeräte … Liefersicherheit", "Firma … Menge"], a: "Gartengeräte … Nachfrage", two: true,
    why: "1) „die … müssen wir nachbestellen” – zamawiamy towar: die Gartengeräte (narzędzia ogrodowe). 2) „bei der Kundschaft sehr groß” – duży jest popyt: die Nachfrage." },
  { s: "Wir sollten die Waren bei verschiedenen Anbietern bestellen, damit wir ___ haben.", opts: ["Liefersicherheit", "Lagerkapazität", "Transportwege"], a: "Liefersicherheit",
    why: "Kilku dostawców = pewność dostaw (Liefersicherheit): gdy jeden zawiedzie, dostarczy drugi. Więcej dostawców nie daje więcej miejsca w magazynie." },
  { s: "Wir müssen die ___ berücksichtigen, wenn wir Lieferanten aus dem Ausland beauftragen.", opts: ["Zollbestimmungen", "Zollbeschaffung", "Zollmaterialien"], a: "Zollbestimmungen",
    why: "Zollbestimmungen = przepisy celne – trzeba je uwzględnić przy dostawcach z zagranicy. „Zollbeschaffung” i „Zollmaterialien” nie istnieją." },
];

const KOLOS_A6 = [
  { prefix: "Sehr geehrter Herr Dr. Kurz,",
    tiles: ["wir", "bedanken", "uns", "für", "Ihre", "Anfrage", "bezüglich", "der", "Pumpen.", "Gerne", "bieten", "wir", "die", "gewünschte", "Pumpe NH17", "zum Preis von", "1.000 € ab Werk", "an."],
    why: "Po przecinku w nagłówku listu piszemy małą literą: „wir bedanken uns”. sich bedanken für + Akkusativ (Ihre Anfrage), bezüglich + Genitiv (der Pumpen). W drugim zdaniu „Gerne” stoi na 1. miejscu, więc czasownik „bieten” na 2., potem „wir”, a przedrostek „an” na samym końcu (anbieten jest rozdzielny). W prawdziwym liście można dodać „Ihnen” (Gerne bieten wir Ihnen …), ale w rozsypance tego słowa nie ma." },
  { tiles: ["Die", "Preise", "verstehen", "sich", "zuzüglich", "geltender", "Mehrwertsteuer."],
    why: "„Die Preise verstehen sich zuzüglich …” = do cen trzeba doliczyć … (ceny netto). zuzüglich + Genitiv: geltender Mehrwertsteuer (Gen. r. ż. bez rodzajnika → -er)." },
  { tiles: ["Die", "Lieferung", "wird", "zum", "01.12.2021", "garantiert."],
    why: "Strona bierna: wird + Partizip II (garantiert) na końcu. zum (= zu dem) + data = na dzień 01.12.2021." },
  { prefix: "Es gelten",
    tiles: ["folgende", "Zahlungsbedingungen:", "14", "Tage", "nach", "Lieferung", "ohne", "Abzug."],
    why: "Es gelten folgende Zahlungsbedingungen: = obowiązują następujące warunki płatności. Po dwukropku: 14 Tage nach Lieferung ohne Abzug = 14 dni od dostawy, bez potrąceń (bez skonta)." },
  { tiles: ["Gerne", "stehen", "wir", "Ihnen", "für", "weitere", "Auskünfte", "zur", "Verfügung."],
    why: "zur Verfügung stehen = być do dyspozycji. „Gerne” na 1. miejscu → czasownik „stehen” na 2., potem wir, Ihnen (Dativ), für weitere Auskünfte, a „zur Verfügung” zamyka zdanie." },
];

const KOLOS_A7 = [
  { s: "Wenn Sie möchten, können Sie ___ sofort die Bestellung stornieren.", opts: ["ab", "über", "bei"], a: "ab",
    why: "ab sofort = od zaraz (ab + początek). über i bei nie łączą się z „sofort”." },
  { s: "Es ist auch möglich, ___ einer Frist von 30 Tagen die Ware zurückzusenden.", opts: ["außerhalb", "bei", "innerhalb"], a: "innerhalb",
    why: "innerhalb + Genitiv = w ciągu: zwrot możliwy w ciągu 30 dni (innerhalb einer Frist). außerhalb = poza – odwrotny sens." },
  { s: "Unser Kundenservice ist den ganzen Tag ___ für Sie erreichbar.", opts: ["über", "ab", "bis zu"], a: "über",
    why: "über + Akkusativ PO rzeczowniku czasu: den ganzen Tag über = przez cały dzień." },
  { s: "Sie können uns auch gerne eine E-Mail schreiben. In diesem Fall erhalten Sie ___ eines Tages eine Antwort von uns.", opts: ["binnen", "über", "seit"], a: "binnen",
    why: "binnen + Genitiv = w ciągu: binnen eines Tages = w ciągu jednego dnia. seit = od (w przeszłości), über – nie z Genitiv." },
  { s: "Leider können wir Ihren Anruf nicht persönlich entgegennehmen, denn Sie rufen ___ unserer Geschäftszeiten an.", opts: ["außerhalb", "innerhalb", "über"], a: "außerhalb",
    why: "Nikt nie odbiera, bo dzwonisz poza godzinami pracy: außerhalb + Genitiv (unserer Geschäftszeiten)." },
  { s: "___ 20. Dezember ___ 5. Januar ist unsere Filiale geschlossen.", opts: ["Vom … bis zum", "Seit dem … bis zum", "Bis zum … ab", "Vom … vor"], a: "Vom … bis zum", two: true,
    why: "Okres od … do: vom (= von dem) 20. Dezember bis zum (= bis zu dem) 5. Januar. „Seit” dotyczy przeszłości trwającej do dziś, a nie zamkniętego okresu." },
  { s: "___ 6. Januar sind wir wieder für Sie da.", opts: ["Ab dem", "Seit dem", "Bei dem"], a: "Ab dem",
    why: "ab + Dativ = od (początek w przyszłości): Ab dem 6. Januar sind wir wieder da. „Seit dem 6. Januar” znaczyłoby, że to już trwa od przeszłości." },
];

const KOLOS_A8 = [
  { cat: "den Eingang bestätigen", pl: "potwierdzić odbiór (dostawy)",
    opts: [
      { t: "Ihre Lieferung ist bis heute nicht bei uns eingetroffen.", ok: false, why: "To skarga, że dostawa NIE dotarła – nie potwierdza odbioru." },
      { t: "Bitte liefern Sie die restlichen Artikel nach.", ok: false, why: "To prośba o dosłanie brakujących rzeczy (um Abhilfe bitten)." },
      { t: "Ihre Lieferung ist am 13. Juni bei uns eingetroffen.", ok: true, why: "Potwierdza, że dostawa dotarła (eintreffen = dotrzeć)." },
      { t: "Den bei Ihnen bestellten Artikel haben wir heute erhalten.", ok: true, why: "Potwierdza otrzymanie (erhalten) zamówionego artykułu." },
    ] },
  { cat: "Fehler benennen", pl: "nazwać błąd / usterkę",
    opts: [
      { t: "Zu unserem Bedauern stellte sich heraus, dass der Artikel defekt war.", ok: true, why: "Nazywa usterkę: artykuł był wadliwy (zu unserem Bedauern = niestety)." },
      { t: "Die bestellten Artikel haben wir erhalten.", ok: false, why: "To tylko potwierdzenie odbioru – bez żadnego błędu." },
      { t: "Bitte liefern Sie die restlichen Artikel nach.", ok: false, why: "To prośba o rozwiązanie problemu, a nie jego nazwanie." },
      { t: "Bei der Warenkontrolle mussten wir feststellen, dass einige Artikel fehlten.", ok: true, why: "Nazywa błąd: przy kontroli towaru brakowało artykułów." },
    ] },
  { cat: "um Abhilfe bitten", pl: "poprosić o usunięcie problemu",
    opts: [
      { t: "Bei der Überprüfung der Lieferung stellte sich heraus, dass einige Artikel fehlen.", ok: false, why: "Nazywa błąd (brakuje artykułów), ale o nic nie prosi." },
      { t: "Wir erwarten, dass Sie den defekten Artikel austauschen.", ok: true, why: "Żąda wymiany wadliwego artykułu – to wezwanie do usunięcia problemu." },
      { t: "Leider stellten wir fest, dass die Lieferung unvollständig war.", ok: false, why: "Tylko stwierdza, że dostawa była niekompletna – nie prosi o rozwiązanie." },
      { t: "Bitte liefern Sie die restlichen Artikel nach.", ok: true, why: "Prosi o dosłanie brakujących artykułów – to prośba o rozwiązanie." },
    ] },
];

const KOLOS_A9_MODEL = [
  ["Zuerst schickt der Kunde eine Anfrage an die Firma, um Informationen über Preise und Lieferfristen zu bekommen.", "Najpierw klient wysyła do firmy zapytanie, żeby dowiedzieć się o ceny i terminy dostaw."],
  ["Die Firma prüft dann, ob die gewünschte Ware verfügbar ist und ob die Lagerkapazität ausreicht.", "Firma sprawdza potem, czy towar jest dostępny i czy wystarczy miejsca w magazynie."],
  ["Danach erstellt sie ein detailliertes Angebot mit Preisen, Lieferfrist und Zahlungsbedingungen.", "Następnie przygotowuje szczegółową ofertę z cenami, terminem dostawy i warunkami płatności."],
  ["Wenn der Kunde mit dem Angebot zufrieden ist, erteilt er der Firma einen Auftrag.", "Jeśli klient jest zadowolony z oferty, udziela firmie zlecenia."],
  ["Die Firma bestätigt die Bestellung mit einer schriftlichen Auftragsbestätigung.", "Firma potwierdza zamówienie pisemnym potwierdzeniem zamówienia."],
  ["Anschließend werden die benötigten Rohmaterialien bei den Lieferanten beschafft.", "Następnie u dostawców kupuje się potrzebne surowce."],
  ["Dann wird die Ware produziert und vor dem Versand sorgfältig kontrolliert.", "Potem towar jest produkowany i przed wysyłką dokładnie sprawdzany."],
  ["Die Ware wird pünktlich zum vereinbarten Liefertermin zusammen mit dem Lieferschein geliefert.", "Towar zostaje dostarczony punktualnie w uzgodnionym terminie razem z dowodem dostawy."],
  ["Danach schreibt die Firma eine Rechnung, die der Kunde innerhalb der Zahlungsfrist begleichen muss.", "Potem firma wystawia fakturę, którą klient musi zapłacić w terminie płatności."],
  ["Zum Schluss wird der Auftrag abgeschlossen, und alle Unterlagen werden archiviert.", "Na koniec zlecenie zostaje zamknięte, a wszystkie dokumenty archiwizowane."],
];

const KOLOS_A9_STEPS = [
  K("Anfrage", "anfrag"),
  K("Angebot", "angebot"),
  K("Auftrag / Bestellung", "auftrag|bestell"),
  K("Auftragsbestätigung", "auftragsbestaetigung|bestaetig"),
  K("Beschaffung / Produktion", "beschaff|produz|produktion|herstell|rohmaterial|fertigung"),
  K("Lieferung / Lieferschein", "lieferung|lieferschein|geliefert|liefert|versand|versendet|verschickt"),
  K("Rechnung", "rechnung"),
  K("Zahlung", "zahlung|zahlt|bezahl|begleich|ueberweis"),
  K("Lieferfrist / Liefertermin", "lieferfrist|liefertermin|lieferzeit|lieferdatum"),
  K("Zahlungsbedingungen / -frist", "zahlungsbedingung|zahlungsfrist|zahlungsziel"),
];
const KOLOS_A9_SEQ = [["zuerst$", "zunaechst$"], ["dann$"], ["danach$"], ["anschliessend$"], ["schliesslich$"], ["nachdem$"], ["sobald$"]];

/* --- Opis zadań --- */

const KOLOS = [
  { n: 1, title: "Fehler und Mängel bei Waren", task: "Ergänzen Sie.", pl: "Uzupełnij – w nawiasie pomieszane litery.", items: KOLOS_A1.length, max: 4 },
  { n: 2, title: "Nomen-Verb-Verbindungen", task: "Was passt? Verbinden Sie.", pl: "Połącz rzeczownik z czasownikiem.", items: 1, max: 6 },
  { n: 3, title: "Qualitätserwartungen", task: "Was ist richtig? Markieren Sie.", pl: "Wybierz pasujący przymiotnik / rzeczownik.", items: KOLOS_A3.length, max: 6 },
  { n: 4, title: "Damit oder um … zu?", task: "Was passt? Markieren Sie.", pl: "Wybierz damit albo um … zu i pasującą formę czasownika.", items: KOLOS_A4.length, max: 5 },
  { n: 5, title: "Beschaffung", task: "Was ist richtig? Markieren Sie.", pl: "Wybierz pasujące słowo.", items: KOLOS_A5.length, max: 8 },
  { n: 6, title: "Anfragen von Unternehmen", task: "Ordnen Sie die Sätze.", pl: "Ułóż zdania listu z ofertą.", items: KOLOS_A6.length, max: 5 },
  { n: 7, title: "Temporale Präpositionen", task: "Was ist richtig? Wählen Sie aus.", pl: "Wybierz przyimek czasu.", items: KOLOS_A7.length, max: 8 },
  { n: 8, title: "Beschwerden und Fehlermeldungen", task: "Was ist richtig? Manchmal gibt es mehrere Möglichkeiten.", pl: "Zaznacz wszystkie pasujące zdania (może być kilka).", items: KOLOS_A8.length, max: 12 },
  { n: 9, title: "Auftragsabwicklung", task: "Beschreiben Sie bitte (10 Sätze): Wie verläuft eine Auftragsabwicklung in einer Firma?", pl: "Opisz w 10 zdaniach przebieg realizacji zamówienia w firmie.", items: 1, max: 10 },
];

const kolosHead = (a) => `<div class="kolos-head">Aufgabe ${a} · ${esc(KOLOS[a - 1].task)}</div>`;
const twoParts = (o) => o.split(" … ");

/* --- Kroki --- */

function kolosMcq(a, i, d, extra = {}) {
  const opts = d.opts.slice();
  const step = {
    kind: "mcq",
    prompt: `${kolosHead(a)}<div class="sent">${gapHTML(d.s).replace("___", '<span class="gap">&nbsp;?&nbsp;</span>')}</div>${d.hint ? `<div class="hint">(${esc(d.hint)})</div>` : ""}`,
    options: shuffle(opts),
    correct: [d.a],
    cols: opts.some((o) => o.length > 16) ? 0 : 2,
    ref: { t: "kolos", k: `a${a}:${i}` },
    kolos: a,
    whyNot: (o) => (d.no && d.no[o]) || null,
    explain: `<i>${esc(d.full || d.s.replace("___", d.a.split(" … ")[0]).replace("___", d.a.split(" … ")[1] || ""))}</i><div class="why">${d.why}</div>`,
    ...extra,
  };
  if (d.two) {
    const [c1, c2] = twoParts(d.a);
    step.pointsFor = (o) => { const [x, y] = twoParts(o); return (x === c1 ? 1 : 0) + (y === c2 ? 1 : 0); };
    step.maxPoints = 2;
    step.explain = `<i>${esc(d.s.replace("___", c1).replace("___", c2))}</i><div class="why">${d.why}</div>`;
  }
  return step;
}

function kolosA2PairStep(i) {
  const p = KOLOS_A2[i];
  return {
    kind: "mcq",
    prompt: `${kolosHead(2)}<div class="big">${esc(p.n)} ___</div><div class="hint">Który czasownik pasuje?</div>`,
    options: shuffle(KOLOS_A2_VERBS),
    correct: [p.v],
    cols: 2,
    ref: { t: "kolos", k: `a2:${i}` },
    kolos: 2,
    explain: `<b>${esc(p.n)} ${esc(p.v)}</b> – ${esc(p.pl)}<br><i>${esc(p.ex)}</i>${p.v === "erfüllen" ? `<div class="why">${KOLOS_A2_NOTE}</div>` : ""}`,
  };
}

function kolosA6Step(i) {
  const d = KOLOS_A6[i];
  return {
    kind: "builder", xp: 20,
    target: d.tiles.join(" "), tiles: d.tiles, prefix: d.prefix, why: d.why,
    label: `${kolosHead(6)}<div class="hint">Zdanie ${i + 1} z 5</div>`,
    reviewPrompt: `${kolosHead(6)}<div class="hint">Zdanie ${i + 1}: ${esc(d.tiles.slice().sort().join(" – "))}</div>`,
    ref: { t: "kolos", k: `a6:${i}` },
    kolos: 6,
  };
}

const kolosA8Step = (i) => ({ kind: "multi", item: KOLOS_A8[i], i, xp: 15, ref: { t: "kolos", k: `a8:${i}` }, kolos: 8,
  reviewPrompt: `${kolosHead(8)}<div class="big">${esc(KOLOS_A8[i].cat)}</div>` });

const kolosA2Step = () => ({ kind: "match", xp: 20, kolos: 2, reviewPrompt: `${kolosHead(2)}<div class="hint">Połącz rzeczowniki z czasownikami</div>` });
const kolosA9Step = () => ({ kind: "write", xp: 40, kolos: 9, reviewPrompt: `${kolosHead(9)}` });

function kolosStepFromKey(key) {
  const m = /^a(\d):(\d+)$/.exec(key || "");
  if (!m) return null;
  const a = +m[1], i = +m[2];
  const lists = { 1: KOLOS_A1, 3: KOLOS_A3, 4: KOLOS_A4, 5: KOLOS_A5, 7: KOLOS_A7 };
  if (lists[a]) return lists[a][i] ? kolosMcq(a, i, lists[a][i]) : null;
  if (a === 2) return KOLOS_A2[i] ? kolosA2PairStep(i) : null;
  if (a === 6) return KOLOS_A6[i] ? kolosA6Step(i) : null;
  if (a === 8) return KOLOS_A8[i] ? kolosA8Step(i) : null;
  return null;
}

function kolosSteps(a) {
  const lists = { 1: KOLOS_A1, 3: KOLOS_A3, 4: KOLOS_A4, 5: KOLOS_A5, 7: KOLOS_A7 };
  if (lists[a]) return lists[a].map((d, i) => kolosMcq(a, i, d));
  if (a === 2) return [kolosA2Step()];
  if (a === 6) return KOLOS_A6.map((_, i) => kolosA6Step(i));
  if (a === 8) return KOLOS_A8.map((_, i) => kolosA8Step(i));
  if (a === 9) return [kolosA9Step()];
  return [];
}

/* Wszystkie pojedyncze pytania (bez A9) – do Sprawdzianu. */
const KOLOS_KEYS = [
  ...KOLOS_A1.map((_, i) => `a1:${i}`), ...KOLOS_A2.map((_, i) => `a2:${i}`), ...KOLOS_A3.map((_, i) => `a3:${i}`),
  ...KOLOS_A4.map((_, i) => `a4:${i}`), ...KOLOS_A5.map((_, i) => `a5:${i}`), ...KOLOS_A6.map((_, i) => `a6:${i}`),
  ...KOLOS_A7.map((_, i) => `a7:${i}`), ...KOLOS_A8.map((_, i) => `a8:${i}`),
];

/* --- Renderer: łączenie w pary (A2) --- */

RENDERERS.match = (el, step, ctx) => {
  const pairs = KOLOS_A2;
  const letters = "abcdef";
  const chosen = pairs.map(() => null);
  let sel = null;
  el.append(h("div", { class: "prompt", html: `${kolosHead(2)}<div class="hint">Dotknij rzeczownik, potem czasownik (albo odwrotnie).</div>` }));
  const rows = h("div", { class: "match-rows" });
  const bank = h("div", { class: "bank match-bank" });
  const checkBtn = h("button", { class: "btn primary" }, ctx.test ? "Zatwierdź" : "Sprawdź");
  el.append(rows, bank, checkBtn);
  let selVerb = null;

  function draw(done) {
    rows.innerHTML = "";
    bank.innerHTML = "";
    pairs.forEach((p, k) => {
      const v = chosen[k];
      const cls = ["match-row", sel === k ? "cur" : "", done ? (v === p.v ? "ok" : "bad") : ""].join(" ");
      const r = h("button", { class: cls, onclick: () => !done && tapRow(k) },
        h("span", { class: "num" }, k + 1), h("b", null, p.n),
        h("span", { class: `slot ${v ? "filled" : ""}` }, v ? `${letters[KOLOS_A2_VERBS.indexOf(v)]}) ${v}` : "…"),
        done && v !== p.v ? h("span", { class: "fix" }, `→ ${p.v}`) : null);
      rows.append(r);
    });
    KOLOS_A2_VERBS.forEach((v, j) => {
      const used = chosen.includes(v);
      bank.append(h("button", { class: `tile ${used ? "used" : ""} ${selVerb === v ? "sel" : ""}`, disabled: done || used ? true : null, onclick: () => tapVerb(v) }, `${letters[j]}) ${v}`));
    });
  }
  function tapRow(k) {
    if (chosen[k]) { chosen[k] = null; sel = k; return draw(); }
    if (selVerb) { chosen[k] = selVerb; selVerb = null; sel = null; return draw(); }
    sel = sel === k ? null : k;
    draw();
  }
  function tapVerb(v) {
    if (sel != null) { chosen[sel] = v; sel = chosen.findIndex((x) => x == null); if (sel < 0) sel = null; selVerb = null; return draw(); }
    selVerb = selVerb === v ? null : v;
    draw();
  }
  checkBtn.addEventListener("click", () => {
    if (chosen.some((x) => x == null) && !confirm("Nie wszystkie pary są połączone. Sprawdzić mimo to?")) return;
    checkBtn.remove();
    let pts = 0;
    pairs.forEach((p, k) => { const ok = chosen[k] === p.v; if (ok) pts++; recordAnswer({ t: "kolos", k: `a2:${k}` }, ok); });
    if (!ctx.test) draw(true);
    ctx.done({
      ok: pts === pairs.length, points: pts, max: pairs.length,
      given: pairs.map((p, k) => `${k + 1}${chosen[k] ? letters[KOLOS_A2_VERBS.indexOf(chosen[k])] : "–"}`).join(" "),
      expected: pairs.map((p, k) => `${k + 1}${letters[KOLOS_A2_VERBS.indexOf(p.v)]}`).join(" "),
      explain: `<div class="score-line">Punkty: <b>${pts}/${pairs.length}</b></div>` + pairs.map((p, k) =>
        `<div class="pair-ex ${chosen[k] === p.v ? "ok" : "bad"}"><b>${esc(p.n)} ${esc(p.v)}</b> – ${esc(p.pl)}${chosen[k] && chosen[k] !== p.v ? ` <span class="muted">(wybrano: ${esc(chosen[k])})</span>` : ""}<br><i>${esc(p.ex)}</i></div>`).join("") +
        `<div class="why">${KOLOS_A2_NOTE}</div>`,
    });
  });
  sel = 0;
  draw();
};

/* --- Renderer: kilka poprawnych odpowiedzi (A8) --- */

RENDERERS.multi = (el, step, ctx) => {
  const it = step.item;
  const letters = "abcd";
  const picked = new Set();
  el.append(h("div", { class: "prompt", html: `${kolosHead(8)}<div class="big">${esc(it.cat)}</div><div class="hint">${esc(it.pl)} · zaznacz wszystkie pasujące</div>` }));
  const list = h("div", { class: "multi-list" });
  const btns = it.opts.map((o, k) => {
    const b = h("button", { class: "opt multi-opt" }, h("span", { class: "box" }), h("span", { class: "letter" }, letters[k] + ")"), h("span", null, o.t));
    b.addEventListener("click", () => {
      if (b.disabled) return;
      if (picked.has(k)) picked.delete(k); else picked.add(k);
      b.classList.toggle("sel", picked.has(k));
    });
    list.append(b);
    return b;
  });
  const checkBtn = h("button", { class: "btn primary" }, ctx.test ? "Zatwierdź" : "Sprawdź");
  el.append(list, checkBtn);
  checkBtn.addEventListener("click", () => {
    checkBtn.remove();
    let pts = 0;
    it.opts.forEach((o, k) => {
      const good = picked.has(k) === o.ok;
      if (good) pts++;
      btns[k].disabled = true;
      if (!ctx.test) btns[k].classList.add(o.ok ? (picked.has(k) ? "ok" : "missed") : picked.has(k) ? "bad" : "dim");
    });
    const corr = it.opts.map((o, k) => (o.ok ? letters[k] : null)).filter(Boolean).join(", ");
    const given = [...picked].sort().map((k) => letters[k]).join(", ") || "nic";
    ctx.done({
      ok: pts === it.opts.length, points: pts, max: it.opts.length,
      given, expected: corr,
      explain: `<div class="score-line">Punkty: <b>${pts}/${it.opts.length}</b> (punkt za każde dobrze zaznaczone lub dobrze pominięte zdanie)</div>` +
        it.opts.map((o, k) => `<div class="pair-ex ${o.ok ? "ok" : "no"}"><b>${letters[k]}) ${o.ok ? "✓" : "✗"}</b> ${esc(o.t)}<br><span class="muted">${esc(o.why)}</span></div>`).join(""),
    });
  });
};

/* --- Renderer: wypracowanie (A9) --- */

function evaluateA9(text) {
  const { raw, words } = tokenize(text);
  const sentences = String(text).split(/[.!?]+/).map((x) => x.trim()).filter((x) => x.split(/\s+/).length >= 3);
  const mark = new Set();
  const hits = [], missed = [], firstAt = [];
  KOLOS_A9_STEPS.forEach((k, j) => {
    const r = findPhrase(words, k.stems);
    if (r) { hits.push(k.label); r.forEach((x) => mark.add(x)); firstAt[j] = r[0]; } else missed.push(k.label);
  });
  const chain = firstAt.slice(0, 8).map((x, j) => (x == null ? null : { x, j })).filter(Boolean);
  let inOrder = 0;
  for (let k = 1; k < chain.length; k++) if (chain[k].x >= chain[k - 1].x) inOrder++;
  const order = chain.length > 1 ? inOrder / (chain.length - 1) : 0;
  const seqMark = new Set();
  let seq = 0;
  for (const alts of KOLOS_A9_SEQ) { const r = findPhrase(words, [alts]); if (r) { seq++; r.forEach((x) => seqMark.add(x)); } }
  const zum = findPhrase(words, [["zum$"], ["schluss$"]]) || findPhrase(words, [["am$"], ["ende$"]]);
  if (zum) { seq++; zum.forEach((x) => seqMark.add(x)); }

  const issues = [];
  const f = words.map((w) => w.f);
  const SUBJ_SG = ["firma", "kunde", "lieferant", "chef", "unternehmen"];
  const PL_VERB = ["muessen", "koennen", "haben", "sind", "wollen", "benoetigen", "machen", "brauchen", "schicken", "bekommen"];
  for (let k = 0; k < f.length - 1; k++) {
    if (SUBJ_SG.includes(f[k]) && PL_VERB.includes(f[k + 1])) { issues.push(`„${words[k].t} ${words[k + 1].t}” – podmiot w liczbie pojedynczej wymaga czasownika w lp.: die Firma muss / kann / hat / braucht.`); break; }
  }
  const SEQ_WORDS = ["zuerst", "zunaechst", "dann", "danach", "anschliessend", "schliesslich"];
  const NOT_VERB = ["der", "die", "das", "ein", "eine", "ich", "wir", "sie", "er", "man", "es"];
  for (let k = 0; k < f.length - 1; k++) {
    if (SEQ_WORDS.includes(f[k]) && NOT_VERB.includes(f[k + 1]) && (k === 0 || /[.!?]\s*$/.test(raw.slice(0, words[k].idx).join("")))) {
      issues.push(`Po „${words[k].t}” na początku zdania czasownik musi stać od razu: „${words[k].t} schickt die Firma …”, a nie „${words[k].t} ${words[k + 1].t} …”.`);
      break;
    }
  }
  const n = sentences.length;
  const parts = {
    sent: Math.min(1, n / 10),
    steps: hits.length / KOLOS_A9_STEPS.length,
    order,
    seq: Math.min(1, seq / 3),
    gram: Math.max(0, 1 - issues.length * 0.5),
  };
  const pct = words.length < 5 ? 0 : Math.round(parts.sent * 20 + parts.steps * 45 + parts.order * 15 + parts.seq * 10 + parts.gram * 10);

  const wIndex = new Map(words.map((w, i) => [w.idx, i]));
  const html = raw.map((t, idx) => {
    const i = wIndex.get(idx);
    if (i == null) return esc(t);
    const cls = mark.has(i) ? "hl-key" : seqMark.has(i) ? "hl-conn" : "";
    return cls ? `<span class="${cls}">${esc(t)}</span>` : esc(t);
  }).join("");

  const tips = [...issues];
  if (n < 10) tips.push(`Masz ${n} ${n === 1 ? "zdanie" : n < 5 && n > 1 ? "zdania" : "zdań"} – zadanie wymaga 10.`);
  if (missed.length) tips.push(`Brakuje etapów: ${missed.slice(0, 4).join(", ")}.`);
  if (chain.length > 2 && order < 1) tips.push("Zachowaj kolejność: Anfrage → Angebot → Auftrag → Auftragsbestätigung → Beschaffung/Produktion → Lieferung → Rechnung → Zahlung.");
  if (seq < 2) tips.push("Używaj słów porządkujących: Zuerst …, Dann …, Danach …, Anschließend …, Zum Schluss … (i od razu po nich czasownik!).");
  if (!tips.length) tips.push("Bardzo dobrze! Porównaj jeszcze swoje zdania ze wzorem poniżej.");
  return { pct, points: Math.round(pct / 10), parts, hits, missed, n, html, tips: tips.slice(0, 3) };
}

function a9ModelHTML() {
  return `<div class="model-a9">${KOLOS_A9_MODEL.map(([de, pl], k) => `<div class="m-row"><b>${k + 1}.</b> ${esc(de)}<div class="muted">${esc(pl)}</div></div>`).join("")}</div>`;
}

RENDERERS.write = (el, step, ctx) => {
  const inp = germanInput({ multiline: true, placeholder: "Zuerst schickt der Kunde eine Anfrage …" });
  inp.input.classList.add("a9-input");
  const counter = h("div", { class: "muted a9-count" }, "Zdania: 0/10 · słowa: 0");
  inp.input.addEventListener("input", () => {
    const t = inp.input.value;
    const n = t.split(/[.!?]+/).map((x) => x.trim()).filter((x) => x.split(/\s+/).length >= 3).length;
    const w = (t.match(/[A-Za-zÄÖÜäöüß]+/g) || []).length;
    counter.textContent = `Zdania: ${n}/10 · słowa: ${w}`;
  });
  const checkBtn = h("button", { class: "btn primary" }, ctx.test ? "Oddaj wypracowanie" : "Sprawdź");
  el.append(
    h("div", { class: "prompt", html: `${kolosHead(9)}<div class="hint">${esc(KOLOS[8].pl)} Etapy: Anfrage → Angebot → Auftrag → Auftragsbestätigung → Beschaffung/Produktion → Lieferung → Rechnung → Zahlung.</div>` }),
    inp.input, inp.keys, counter, checkBtn);
  checkBtn.addEventListener("click", () => {
    const text = inp.input.value.trim();
    if (!text && !confirm("Pole jest puste. Oddać bez odpowiedzi?")) return;
    checkBtn.remove();
    inp.input.disabled = true;
    const ev = evaluateA9(text);
    const bar = (label, v) => `<div class="rec-part"><span>${label}</span><div class="bar"><i style="width:${Math.round(v * 100)}%"></i></div></div>`;
    ctx.done({
      ok: ev.pct >= 60, points: ev.points, max: 10, given: null, expected: null,
      explain: `<div class="score-line">Wynik: <b>${ev.pct}%</b> · <b>${ev.points}/10 pkt</b> · zdań: ${ev.n}</div>` +
        bar("10 zdań", ev.parts.sent) + bar("Etapy", ev.parts.steps) + bar("Kolejność", ev.parts.order) + bar("Słowa porządkujące", ev.parts.seq) + bar("Gramatyka (proste błędy)", ev.parts.gram) +
        (text ? `<div class="transcript-hl" style="margin-top:10px">${ev.html}</div>` : "") +
        `<div class="rec-chips" style="margin-top:8px">${ev.hits.map((x) => `<span class="rec-chip ok">✓ ${esc(x)}</span>`).join("")}${ev.missed.map((x) => `<span class="rec-chip miss">${esc(x)}</span>`).join("")}</div>` +
        `<div class="tips">${ev.tips.map((t) => `<div class="tip">💡 ${esc(t)}</div>`).join("")}</div>` +
        `<div class="muted" style="font-size:12px;margin-top:6px">Ocena automatyczna sprawdza etapy, kolejność i kilka typowych błędów – nie zastąpi nauczyciela.</div>` +
        `<div class="section-title">Wzór (10 zdań)</div>${a9ModelHTML()}`,
    });
    if (!ctx.test) {
      el.append(h("button", { class: "btn ghost", onclick: () => speakChain(KOLOS_A9_MODEL.map((x) => x[0])) }, "▶ Odsłuchaj wzór"));
    }
  });
};

/* --- Ekrany --- */

const kolosStore = () => (S.kolos = S.kolos || { history: [], best: {} });

function kolosTile() {
  const k = kolosStore();
  const best = k.history.length ? Math.max(...k.history.map((x) => x.pct)) : null;
  return h("button", { class: "mode wide kolos-tile", onclick: kolosMenu },
    h("span", { class: "badge", style: "background:#fecaca" }, "KOL"),
    h("span", null, h("b", null, "Kolos – zadania z arkusza"), h("br"),
      h("small", null, best != null ? `9 zadań · symulacja z oceną · najlepiej ${best}%` : "9 zadań jak na kolosie · symulacja z oceną")));
}

function kolosMenu() {
  const k = kolosStore();
  show("Kolos", (el) => {
    const errs = errorList().filter((e) => e.ref.t === "kolos" && stepFromRef(e.ref));
    el.append(
      h("div", { class: "card" },
        h("b", null, "Tylko zadania z kolosa"),
        h("div", { class: "muted", style: "margin-top:6px;font-size:15px" }, "Ćwicz pojedyncze zadanie z wyjaśnieniem po każdej odpowiedzi albo napisz całą symulację – wtedy podpowiedzi zobaczysz dopiero na końcu, razem z oceną.")),
      h("button", { class: "btn primary", onclick: () => kolosSimulation() }, "Symulacja kolosa (zadania 1–9)"),
      ...(errs.length ? [h("button", { class: "btn ghost", onclick: () => runSession({ title: "Kolos – błędy", steps: shuffle(errs.map((e) => stepFromRef(e.ref))), back: kolosMenu, again: kolosMenu }) }, `Popraw błędy z kolosa (${errs.length})`)] : []),
      h("div", { class: "section-title" }, "Ćwicz jedno zadanie"),
      ...KOLOS.map((a) => h("button", { class: "day", onclick: () => kolosPractice(a.n) },
        h("span", { class: "num" }, a.n),
        h("span", null, h("b", null, a.title), h("br"), h("small", { class: "muted" }, a.pl),
          k.best[a.n] != null ? h("small", { class: "kolos-best" }, ` · najlepiej ${k.best[a.n]}/${a.max}`) : null))));
    if (k.history.length) {
      el.append(h("div", { class: "section-title" }, "Historia symulacji"),
        h("div", { class: "card" }, h("table", { class: "stats" }, k.history.slice(-8).reverse().map((t) => h("tr", null,
          h("td", null, new Date(t.at).toLocaleDateString("pl-PL"), " · ", `${t.points}/${t.max} pkt`),
          h("td", null, `${t.pct}% · ${t.grade}`))))));
    }
  });
}

const stepPoints = (x) => (x.res.points != null ? x.res.points : x.res.ok ? 1 : 0);
const stepMax = (x) => (x.res.max != null ? x.res.max : x.step.maxPoints || 1);

function kolosPractice(a) {
  const A = KOLOS[a - 1];
  const steps = a === 9 || a === 2 ? kolosSteps(a) : shuffle(kolosSteps(a));
  runSession({
    title: `Aufgabe ${a}`, steps, back: kolosMenu, again: () => kolosPractice(a),
    onFinish: (r, body) => {
      const pts = r.log.reduce((s, x) => s + stepPoints(x), 0);
      const max = r.log.reduce((s, x) => s + stepMax(x), 0);
      const k = kolosStore();
      if (max === A.max && (k.best[a] == null || pts > k.best[a])) k.best[a] = pts;
      save();
      body.append(...[
        h("div", { class: "card center" }, h("b", null, `Punkty: ${pts}/${max}`)),
        h("button", { class: "btn primary", onclick: () => kolosPractice(a) }, "Jeszcze raz"),
        a < 9 ? h("button", { class: "btn ghost", onclick: () => kolosPractice(a + 1) }, `Następne: Aufgabe ${a + 1}`) : null,
        h("button", { class: "btn ghost", onclick: kolosMenu }, "Menu kolosa")].filter(Boolean));
    },
  });
}

function kolosSimulation() {
  const steps = KOLOS.flatMap((a) => kolosSteps(a.n));
  runSession({
    title: "Symulacja kolosa", steps, test: true, back: kolosMenu,
    intro: h("div", { class: "story" }, h("div", { class: "who" }, `Symulacja kolosa · 9 zadań · ${KOLOS.reduce((s, a) => s + a.max, 0)} pkt`),
      "Zadania jak na arkuszu, w tej samej kolejności. Bez podpowiedzi – wynik, ocena i omówienie na końcu. W zadaniu 8 może być kilka poprawnych odpowiedzi."),
    onFinish: (r, body) => {
      const per = KOLOS.map((a) => ({ a, pts: 0, max: 0 }));
      for (const x of r.log) { const p = per[x.step.kolos - 1]; p.pts += stepPoints(x); p.max += stepMax(x); }
      const points = per.reduce((s, p) => s + p.pts, 0);
      const max = per.reduce((s, p) => s + p.max, 0);
      const pct = Math.round((points / Math.max(1, max)) * 100);
      const gr = gradeFor(pct);
      const k = kolosStore();
      k.history.push({ at: Date.now(), points, max, pct, grade: gr.g });
      per.forEach((p) => { if (p.max === p.a.max && (k.best[p.a.n] == null || p.pts > k.best[p.a.n])) k.best[p.a.n] = p.pts; });
      S.stats.kolosBest = Math.max(S.stats.kolosBest || 0, pct);
      if (gr.g === "5.0") S.stats.kolosFive = (S.stats.kolosFive || 0) + 1;
      save();
      addXP(points * 3);
      if (typeof checkBadges === "function") checkBadges();
      if (pct >= 90 && typeof celebrate === "function") celebrate();
      const wrong = r.log.filter((x) => stepPoints(x) < stepMax(x));
      body.append(
        h("div", { class: "card center pop" },
          h("div", { class: "muted" }, "Wynik symulacji"),
          h("div", { class: "result-big" }, `${pct}%`),
          h("div", { style: "font-size:22px;font-weight:800" }, `Ocena: ${gr.g}`),
          h("div", { class: "muted" }, `${gr.label} · ${points}/${max} pkt · +${points * 3} XP`)),
        h("div", { class: "card" }, h("table", { class: "stats" }, per.map((p) => h("tr", null,
          h("td", null, `${p.a.n}. ${p.a.title}`), h("td", { class: p.pts === p.max ? "ok-text" : "" }, `${p.pts}/${p.max}`))))),
        wrong.length ? h("div", { class: "section-title" }, `Omówienie (${wrong.length})`) : h("div", { class: "card center" }, "Bezbłędnie – gratulacje!"),
        ...wrong.map((x) => h("div", { class: "card review" },
          h("div", { class: "prompt", html: stepPromptHTML(x.step) }),
          feedbackEl({ ...x.res, ok: false, rule: x.res.rule || x.step.rule }))),
        h("button", { class: "btn primary", onclick: () => kolosSimulation() }, "Nowa symulacja"),
        h("button", { class: "btn ghost", onclick: kolosMenu }, "Menu kolosa"));
    },
  });
}

/* --- Integracja z resztą aplikacji --- */

TYPE_NAMES.kolos = "Kolos";
STEP_FROM_REF.kolos = (ref) => kolosStepFromKey(ref.k);
GRAMMAR_TOPICS.push({ id: "kolos", name: "Kolos (zadania 1–8)", total: () => KOLOS_KEYS.length, make: (i) => kolosStepFromKey(KOLOS_KEYS[i]) });
BADGES.push(
  { id: "kolos", icon: "📄", name: "Próbny kolos", desc: "Napisz symulację kolosa", goal: 1, val: () => (S.kolos && S.kolos.history ? S.kolos.history.length : 0) },
  { id: "kolos5", icon: "🎓", name: "Kolos na piątkę", desc: "Symulacja kolosa na 90%+", goal: 1, val: () => st("kolosFive") },
);
