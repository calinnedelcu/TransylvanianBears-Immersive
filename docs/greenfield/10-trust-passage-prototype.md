# Trust Passage prototype: Aegis / SchoolMate

Status: contract de interacțiune aprobat pentru graybox-ul integrat în Macro Flow.

## Decizia

Trust Passage nu simulează hacking și nu transformă securitatea într-un puzzle. Vizitatorul
urmărește un eveniment real prin sistem, poate schimba condiția tokenului și vede aceeași
tranzacție ajungând la rezultate diferite.

Secvența păstrează două adevăruri editoriale distincte:

1. **Aegis** este cazul despre control de acces, token scurt, roluri și audit.
2. **SchoolMate** este cazul despre operațiuni și comunicare școlară: anunțuri, cereri,
   orare, administrație și identificare la poartă.

Sunt produse separate, conectate prin domeniu și echipă. Website-ul nu le prezintă drept
versiuni succesive ale aceluiași produs.

## Fapte verificate din implementare

- tokenul QR este generat numai în backend cu `randomBytes(32)` și codare `base64url`;
- tokenul este opac, are 256 biți, expiră după 20 de secunde și pornește cu `used: false`;
- numai un cont cu rol `gate` sau `admin` poate apela redeem-ul;
- redeem-ul rulează într-o tranzacție Firestore și marchează tokenul `used: true`;
- stările reale includ `NOT_FOUND`, `ALREADY_USED`, `EXPIRED`, `USER_DISABLED`,
  `NO_SCHEDULE`, acces permis și acces refuzat în funcție de starea elevului;
- evenimentul este scris în `accessEvents` după commit-ul tranzacției;
- Aegis documentează cinci roluri: student, parent, teacher, admin și gate device;
- SchoolMate documentează șase suprafețe de rol: elev, profesor/diriginte, secretariat,
  părinte și portar, cu fluxuri distincte în aceeași aplicație;
- SchoolMate are APK, portal web, demo video, pitch video și business plan publice.

## Micro-loop

Vizitatorul alege una dintre trei condiții reale:

| Condiție | Traseu | Rezultat |
| --- | --- | --- |
| token valid | issue -> present -> gate auth -> atomic redeem -> audit | `ALLOW` |
| token expirat | issue -> present -> gate auth -> expiry check -> audit | `DENY / EXPIRED` |
| token folosit | issue -> present -> gate auth -> used check -> audit | `DENY / ALREADY_USED` |

Interacțiunea nu cere ghicirea rezultatului. Scopul este comparația și inspectarea regulii.
Butonul `Rulează trace-ul` pornește o secvență scurtă, iar fiecare stare rămâne exprimată și
în DOM semantic pentru tastatură și cititoare de ecran.

## Continuitate materială

1. Bounding-box-urile Nexus se ridică în cadrele pasajului.
2. Un punct din ultimul box devine tokenul opac.
3. Cadrele succesive devin cele cinci stări ale tranzacției.
4. După rezultat, cadrele se aplatizează într-un plan editorial cu cele două produse.
5. La ieșire, planul se pliază în straturi minerale pentru Rule Descent / The Buried Hands.

## Clearing editorial

Clearing-ul nu combină proiectele într-un singur card. Este o bandă editorială cu două
studii scurte separate:

- Aegis: captură QR, 20s, 256-bit, cinci roluri, locul 2 Skills for the Future, repo;
- SchoolMate: captură portal, șase suprafețe de rol, anunțuri/cereri/orar, demo, pitch,
  portal web și repo.

Copy-ul nu promite adopție, eficiență sau impact măsurat. Obiectivele din business plan sunt
prezentate numai ca obiective, nu ca rezultate.

## Surse primare

- [Aegis repository](https://github.com/BosRegele/Aegis)
- [Aegis Cloud Functions](https://github.com/BosRegele/Aegis/blob/main/functions/index.js)
- [Aegis gate scanner](https://github.com/BosRegele/Aegis/blob/main/lib/gate/gate_scan_page.dart)
- [SchoolMate repository](https://github.com/calinnedelcu/SchoolMate-final)
- [SchoolMate README](https://github.com/calinnedelcu/SchoolMate-final/blob/main/README.md)
- [SchoolMate business plan](https://github.com/calinnedelcu/SchoolMate-final/blob/main/livrabile/business-plan.md)

