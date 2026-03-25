# Liberaali voitto

Interaktiivinen vaalidata-analyysi — konversiokartta ja äänestystilastot.

## Nykyinen sisältö

- **Konversiokartta · Helsinki · Eduskuntavaalit 2023** — SVG-pohjainen koropleettkartta, joka näyttää äänestysalueiden konversiopisteet ja oikeistopotentiaalin

## Tekninen toteutus

Yksittäinen `index.html`-tiedosto — ei buildityökaluja, ei ulkoisia riippuvuuksia. Data on upotettu GeoJSON-muodossa suoraan HTML:ään.

## Kehitys

```bash
# Avaa paikallisesti
open index.html

# Tai käytä pientä lokaalia serveriä
python3 -m http.server 8080
```

Jokainen `git push` → automaattinen deploy Netlifyyn.

## Data

- `data/` — tuleva hakemisto purkautuville GeoJSON-datatiedostoille
- Äänestysdata: Oikeusministeriö / tulopalvelu.vaalit.fi
