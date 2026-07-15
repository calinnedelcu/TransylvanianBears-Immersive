# Rule Descent / The Buried Hands

## Surse primare

- [pagina publică a jocului pe itch.io](https://juggypuggy.itch.io/the-buried-hands)
- [submission-ul Game Jam Vianu 2026](https://itch.io/jam/game-jam-vianu-2026/rate/4585325)
- [trailerul public](https://www.youtube.com/watch?v=RGyx2NxUYr8)
- cele opt capturi publicate de echipă pe pagina itch.io; patru cadre sunt păstrate în
  `public/assets/projects/buried-hands/`

## Fapte folosite în prototip

- Premisa este plasată în anul 210 î.Hr., în mausoleul lui Qin Shi Huang.
- Personajul este un meșteșugar, nu un războinic.
- Lampa consumă ulei, iar lumina amplificată consumă mai mult.
- Gardienii aud pașii.
- Vaporii de mercur sunt o amenințare, nu decor.
- Mecanismele și capcanele sunt explicate prin cunoașterea meșteșugarului.
- Build-ul public este pentru Windows și pagina proiectului declară Godot 4.6,
  GDScript, Jolt Physics și Forward Plus.

Locul 2 rămâne formulat ca rezultat confirmat de echipă până când este disponibilă
dovada oficială a clasamentului.

## Bucla prototipului

1. Traseul validat din Aegis se pliază în straturi minerale.
2. Camera trece printr-un prag 3D inspirat de geometria low-poly a jocului.
3. Un cadru autentic din build devine suprafața principală a capitolului.
4. Vizitatorul deplasează lumina și poate inspecta trei noduri reale: ulei,
   mecanism și vapori.
5. Fiecare nod descoperit explică o regulă, fără să pretindă că site-ul reproduce
   gameplay-ul complet.
6. Clearing-ul arată cadre reale pentru gardieni, mercur și Sala Regală, apoi oferă
   build-ul, trailerul și submission-ul public.

## Reguli de implementare

- Scroll-ul nu pornește sunet.
- Interacțiunea cu lampa funcționează cu pointer, tastatură și touch.
- Conținutul de dovadă nu este blocat în spatele descoperirii tuturor nodurilor.
- `prefers-reduced-motion` păstrează lumina și nodurile, dar elimină deplasarea
  interpolată.
- Capturile autentice sunt tratate ca gameplay, nu ca texturi decorative.

## Continuitate

`traseu validat -> plan pliat -> strat mineral -> coridor -> lumină -> pixel`

Ieșirea pregătește interludiul Infect.exe: lumina se contractă până la un singur
pixel, iar acel pixel poate deveni apoi observație în Research Crossing.
