# Rule Descent / The Buried Hands

## Surse primare

- [pagina publică a jocului pe itch.io](https://juggypuggy.itch.io/the-buried-hands)
- [submission-ul Game Jam Vianu 2026](https://itch.io/jam/game-jam-vianu-2026/rate/4585325)
- [clipul public de gameplay](https://www.youtube.com/watch?v=RGyx2NxUYr8)
- cele opt capturi publicate de echipă pe pagina itch.io; patru cadre sunt păstrate în
  `public/assets/projects/buried-hands/`

## Fapte folosite în prototip

- Premisa este plasată în anul 210 î.Hr., în mausoleul lui Qin Shi Huang.
- Personajul este un meșteșugar, nu un războinic.
- Lampa consumă ulei, iar jocul oferă separat o comandă pentru mai multă lumină.
- Gardienii aud pașii.
- Vaporii de mercur sunt o amenințare, nu decor.
- Mecanismele și capcanele sunt explicate prin cunoașterea meșteșugarului.
- Build-ul public este pentru Windows și pagina proiectului declară Godot 4.6,
  GDScript, Jolt Physics și Forward Plus.

Clasarea pe locul 2 este confirmată la 01:37 în clipul oficial RGDA al evenimentului,
urmat imediat de segmentul The Buried Hands.

## Bucla de producție

1. Traseul validat din Aegis se pliază în straturi minerale.
2. Camera urmează traseul 3D authored prin mausoleu.
3. Vizitatorul ridică o singură lampă; scroll-ul rezolvă aceeași stare canonică dacă
   acțiunea nu este folosită.
4. Fasciculul regizat trece în ordine peste ulei, mecanism și vapori. Acestea sunt
   momente de dovadă, nu hotspoturi sau alegeri.
5. Cadrele publice ocupă aperturi fizice din scenă și explică regulile fără să
   pretindă că site-ul reproduce gameplay-ul complet.
6. Clearing-ul oferă build-ul, clipul de gameplay și submission-ul public.

## Reguli de implementare

- Scroll-ul nu pornește sunet.
- Interacțiunea cu lampa funcționează cu pointer, tastatură și touch.
- Conținutul de dovadă nu este blocat în spatele descoperirii tuturor nodurilor.
- `prefers-reduced-motion` păstrează comanda lămpii și dovezile ordonate, dar elimină
  camera interpolată și mișcările secundare.
- Capturile autentice sunt tratate ca gameplay, nu ca texturi decorative.

## Continuitate

`traseu validat -> plan pliat -> strat mineral -> coridor -> lumină -> pixel`

Ieșirea pregătește interludiul Infect.exe: lumina se contractă până la un singur
pixel, iar acel pixel poate deveni apoi observație în Research Crossing.
