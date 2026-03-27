# Liberaali voitto

Interaktiivinen vaalidata-analyysi pääkaupunkiseudun vuoden 2023 eduskuntavaaleista. Sovellus näyttää äänestysalueet ja postinumeroalueet kartalla, pisteyttää alueita Liberaalipuolueen konversiopotentiaalin perusteella ja yhdistää vaalitulokset Tilastokeskuksen sosioekonomiseen dataan.

## Nykyinen sisältö

- SVG-pohjainen karttanäkymä pääkaupunkiseudun 304 äänestysalueesta
- Useita tarkastelutiloja: konversiopisteet, oikeistopooli, nukkuvat, LIBE-%, suurin puolue ja "Puolueet + nukkuvat"
- Sivupaneeli aluekohtaisille tunnusluvuille, ehdokaslistoille ja puoluejakaumalle
- Ranking-näkymä kaikkien alueiden vertailuun
- Postinumeroaluenäkymä 172 PKS-postinumeroalueen vaalitulosten aggregaatilla
- Sosioekonominen konversioanalyysi: 7 indikaattorin painotettu pisteytys yhdistettynä vaalituloksiin, 169 postinumeroaluetta
- Erillinen metodologiasivu laskentakaavoille ja perusteluille

Mukana on dataa Helsingistä, Espoosta, Vantaalta ja Kauniaisista.

## Tekninen toteutus

Projekti on rakennettu Viten päälle ja käyttää D3.js v7:ää kartan piirtämiseen. Puhdas vanilla JS, ei frameworkeja.

### Lähdekooditiedostot

- [`src/main.js`](./src/main.js) — Sovelluksen entry point: datan lataus, sivunvaihto, global handlers
- [`src/map.js`](./src/map.js) — Äänestysaluekartan piirto, zoom ja interaktio
- [`src/modes.js`](./src/modes.js) — Vaalitulospisteytys, percentile-ranking, väriskaala
- [`src/sidebar.js`](./src/sidebar.js) — Aluepaneeli, selite, ehdokaslistat
- [`src/ranking.js`](./src/ranking.js) — Ranking-näkymä
- [`src/posti.js`](./src/posti.js) — Postinumeroalueiden karttanäkymä
- [`src/socio.js`](./src/socio.js) — Sosioekonomisen analyysin kartta ja sivupalkki
- [`src/socio-modes.js`](./src/socio-modes.js) — Sosioekonominen pisteytys (7 komponenttia, painotettu percentile-ranking)
- [`src/score-utils.js`](./src/score-utils.js) — Jaetut pisteytysapufunktiot (percentile-ranking, pyöristys)
- [`src/geo-utils.js`](./src/geo-utils.js) — Postinumero→äänestysalue-kohdistus (point-in-polygon)
- [`src/style.css`](./src/style.css) — Kaikki tyylit

### Skriptit

- [`scripts/fetch-paavo.js`](./scripts/fetch-paavo.js) — Hakee sosioekonomisen datan Tilastokeskuksen PxWeb-rajapinnasta

### HTML

- [`index.html`](./index.html) — Sovelluksen runko (3 sivua: vaalit, postinumerot, sosioekonominen)
- [`public/metodologia.html`](./public/metodologia.html) — Metodologiadokumentaatio

Sovellus ei tarvitse backendiä tai erillisiä API-avaimia.

## Kehitys

Asenna riippuvuudet:

```bash
npm install
```

Käynnistä kehityspalvelin:

```bash
npm run dev
```

Hae sosioekonominen data Tilastokeskuksesta (tarvitsee tehdä vain kerran tai kun PAAVO-data päivittyy):

```bash
npm run fetch-paavo
```

Rakenna tuotantoversio:

```bash
npm run build
```

Esikatsele tuotantobuildia lokaalisti:

```bash
npm run preview
```

Vite on konfiguroitu GitHub Pages -julkaisua varten repositorion alihakemistoon `'/liberaali-voitto/'`.

## Deploy

Push `master`-haaraan käynnistää GitHub Actions -workflow'n, joka:

1. asentaa riippuvuudet
2. rakentaa sovelluksen
3. deployaa `dist/`-hakemiston GitHub Pagesiin

Deploy-konfiguraatio löytyy tiedostosta [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml).

## Datan lähteet

Projektissa käytetään neljää ulkoista lähdettä:

- [Oikeusministeriö / Tieto- ja tulospalvelu, Eduskuntavaalit 2023](https://tulospalvelu.vaalit.fi/EKV-2023/fi/index.html)
  - puolue- ja ehdokastason vaalitulokset äänestysalueittain
- [Helsinki Region Infoshare: Pääkaupunkiseudun äänestysaluejako](https://hri.fi/data/fi/dataset/paakaupunkiseudun-aanestysaluejako)
  - äänestysalueiden rajat Helsingissä, Espoossa, Vantaalla ja Kauniaisissa
  - HRI:n aineistokuvauksen mukaan vuosien 2024-25 äänestysaluejako on sama kuin vuonna 2023, joten samaa geometriaa voidaan käyttää vuoden 2023 vaalitulosten kanssa
- [Maanmittauslaitos: Hallinnolliset aluejaot, vektori](https://www.maanmittauslaitos.fi/kartat-ja-paikkatieto/aineistot-ja-rajapinnat/tuotekuvaukset/hallinnolliset-aluejaot-vektori)
  - kuntarajat kartan overlay-kerrosta varten
- [Tilastokeskus: PAAVO — Postinumeroalueittainen avoin tieto](https://pxdata.stat.fi/PxWeb/pxweb/fi/Postinumeroalueittainen_avoin_tieto/)
  - sosioekonominen data postinumeroalueittain (koulutus, tulot, työllisyys, toimialarakenne, väestörakenne)
  - data haetaan PxWeb JSON-stat2 -rajapinnasta build-aikaisesti (`npm run fetch-paavo`)

## Datan lisenssit

Kaikki ulkoiset datalähteet ovat avoimesti lisensoituja (CC BY 4.0):

| Lähde | Lisenssi |
|-------|----------|
| Oikeusministeriö — Tieto- ja tulospalvelu | CC BY 4.0 |
| Helsinki Region Infoshare — Äänestysaluejako | CC BY 4.0 |
| Maanmittauslaitos — Hallinnolliset aluejaot | CC BY 4.0 |
| Tilastokeskus — PAAVO | CC BY 4.0 |

## Projektin data

Sovellus lataa selaimessa seuraavat JSON-aineistot:

- `public/data/geo.json`
  - projektissa koottu GeoJSON, joka yhdistää HRI:n äänestysaluegeometrian ja Oikeusministeriön vuoden 2023 vaalitulokset
- `public/data/postinumero.json`
  - pääkaupunkiseudun postinumeroalueiden rajat (172 aluetta)
- `public/data/paavo_socio.json`
  - Tilastokeskuksen PAAVO-aineistosta johdetut sosioekonomisen indikaattorit (169 aluetta)
  - generoidaan `npm run fetch-paavo` -skriptillä
- `public/data/a_alueet.json`
  - `geo.json`:sta johdettu A-alueiden koontidata
- `public/data/municipal_borders.json`
  - Maanmittauslaitoksen hallinnollisista aluejaoista irrotettu PKS-kuntien rajakerros
- `public/data/elected_vertaus.json`
  - Oikeusministeriön tulospalvelun valittujen ehdokkaiden vertailutiedot
- `public/data/libe_per_area.json`
  - Oikeusministeriön ehdokaskohtaisista äänestysaluetuloksista johdettu LIBE-ehdokkaiden aluekohtainen näkymä
- `public/data/convert_targets.json`
  - Oikeusministeriön ehdokaskohtaisista äänestysaluetuloksista johdettu kohdelista
- `public/data/elected_area_votes.json`
  - Oikeusministeriön ehdokaskohtaisista äänestysaluetuloksista johdettu valittujen ehdokkaiden aluekohtainen yhteenveto

## Lisenssi

MIT License — Copyright (c) 2026 Harri Juntunen. Katso [LICENSE](./LICENSE).
