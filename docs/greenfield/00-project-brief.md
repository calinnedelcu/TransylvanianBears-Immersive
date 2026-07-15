# Transylvanian Bears: greenfield brief

Status: preproducție

Acest document definește problema și criteriile după care evaluăm conceptul. Site-ul
existent este o sursă de informații, nu o constrângere de design sau tehnologie.

## Obiectiv

Construim casa digitală a unei echipe multidisciplinare de elevi care produce jocuri,
produse software, cercetare și proiecte AI. Experiența trebuie să facă simultan trei
lucruri:

1. Să creeze o primă impresie memorabilă și proprie echipei.
2. Să demonstreze credibilitate prin proiecte, roluri și rezultate verificabile.
3. Să permită acces rapid pentru oamenii care nu vor o experiență cinematică lungă.

Nu construim un simplu portofoliu decorat cu efecte 3D. Construim o lume coerentă în
care identitatea, navigația, mișcarea, sunetul și conținutul folosesc aceeași idee.

## Audiențe

### Jurați și organizatori

Au nevoie să înțeleagă rapid ce a realizat echipa, cine a contribuit, ce rezultat a
obținut și unde este dovada.

### Potențiali membri

Au nevoie să înțeleagă standardul echipei, disciplinele existente, cultura de lucru,
rolurile disponibile și procesul de selecție.

### Mentori și parteneri

Au nevoie de maturitate operațională, rezultate, nevoi concrete, moduri de implicare
și o persoană reală de contact.

### Comunitatea tehnică

Are nevoie de build-uri, repo-uri, lucrări, postmortem-uri, writeup-uri și explicații
care arată procesul, nu doar rezultatul final.

## Principii de produs

1. **Poveste înainte de efect.** Fiecare mișcare trebuie să explice, să transforme sau
   să conecteze conținutul.
2. **Dovadă înainte de laudă.** Premiile au concurs, dată, proiect, componență și link.
3. **O lume, nu secțiuni independente.** Homepage-ul are continuitate spațială și
   temporală.
4. **Două viteze.** Guided Journey pentru impact și Fast Access pentru eficiență.
5. **Conținut semantic real.** Canvas-ul nu înlocuiește titlurile, linkurile, paginile
   și structura accesibilă.
6. **Mobil compus separat.** Nu micșorăm experiența desktop și nu ascundem problemele
   prin dezactivarea arbitrară a conținutului.
7. **Resursele de producție pot fi mari; resursele dispozitivului nu sunt.** Calitatea
   include timpi de încărcare, autonomie, control și stabilitate.
8. **Nicio afirmație inventată.** Placeholder-ele personale sunt interne și dispar la
   lansare dacă nu există material real.

## Moduri de utilizare

### Guided Journey

O călătorie scroll-driven de aproximativ 3-4 minute, cu capitole, cameră regizată,
interacțiuni opționale și sunet opt-in.

### Fast Access

Navigație persistentă către Work, Team, Archive, Field Notes, Join și Partners. Nu
există loader obligatoriu, intro imposibil de sărit sau blocarea accesului la pagini.

### Reduced Motion

O versiune editorială completă, nu o experiență incompletă. Păstrează toate
informațiile și înlocuiește mișcarea amplă cu schimbări de stare discrete.

## Arhitectură informațională

- `/`: experiența narativă și proiectele reprezentative.
- `/work`: proiectele oficiale ale echipei și colaborările creditate.
- `/work/[slug]`: studiu de caz complet.
- `/team`: membrii, disciplinele și contribuțiile în proiectele echipei.
- `/team/[slug]`: profil, credite, experiență și proiecte personale selectate.
- `/archive`: concursuri, rezultate și dovezi.
- `/field-notes`: cercetare, CTF writeup-uri, postmortem-uri și experimente.
- `/join`: roluri, așteptări, proces și formular.
- `/partners`: mentori, sponsori, presă și media kit.

Homepage-ul folosește etichete familiare în navigație. Limbajul narativ precum "The
Pack" poate apărea în scenă, dar nu trebuie să reducă înțelegerea meniului.

## Criterii pentru un proiect reprezentativ

Un proiect intră în povestea principală dacă are:

- contribuție clară a echipei;
- rezultat sau progres demonstrabil;
- mediu vizual suficient pentru o scenă distinctă;
- disciplină diferită față de celelalte proiecte prezentate;
- materiale reale: build, capturi, video, repo, lucrare sau prezentare;
- poveste completă despre problemă, decizie, proces și rezultat.

Homepage-ul nu trebuie să transforme toate proiectele în capitole egale. Patru
proiecte puternice sunt mai convingătoare decât șapte rezumate superficiale.

## Criterii de calitate

- Identitatea este recognoscibilă și fără numele echipei.
- Prima secvență comunică numele și natura echipei în primul viewport.
- Fiecare proiect are autori și contribuții explicite.
- Orice rezultat poate fi verificat din aceeași pagină.
- Utilizatorul poate ajunge la orice rută în maximum două acțiuni.
- Desktop-ul are o experiență fluidă, iar mobilul are o compoziție intenționată.
- Tastatura, cititorul de ecran și reduced motion oferă acces la același conținut.
- Nu există sunet pornit automat.
- Scenele se încarcă progresiv și nu blochează conținutul editorial.

## Anti-obiective

- Nu folosim Dracula, sânge, lilieci sau horror generic ca identitate transilvăneană.
- Nu folosim un castel generic plus linii neon drept substitut pentru un concept.
- Nu facem o paletă dominată integral de bordo, auriu sau albastru închis.
- Nu folosim mascotă cartoon ca semnal principal de maturitate.
- Nu construim câte un canvas independent pentru fiecare secțiune.
- Nu ascundem conținut important în hover-uri sau hotspot-uri fără alternativă.
- Nu inventăm proiecte, statistici, roluri sau premii.
- Nu producem scene finale înainte de storyboard și vertical slice.

## Gate-uri de producție

O fază se închide numai dacă are:

1. research documentat;
2. alternative comparate;
3. o decizie și motivul ei;
4. un artefact testabil;
5. criterii clare pentru a continua sau a reveni.

