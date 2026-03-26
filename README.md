# Liberaali voitto

Interaktiivinen vaalidata-analyysi pääkaupunkiseudun vuoden 2023 eduskuntavaaleista. Sovellus näyttää äänestysalueet kartalla ja pisteyttää alueita Liberaalipuolueen konversiopotentiaalin perusteella.

## Nykyinen sisältö

- SVG-pohjainen karttanäkymä pääkaupunkiseudun äänestysalueista
- Useita tarkastelutiloja: konversiopisteet, oikeistopooli, nukkuvat, LIBE-%, suurin puolue ja "Puolueet + nukkuvat"
- Sivupaneeli aluekohtaisille tunnusluvuille, ehdokaslistoille ja puoluejakaumalle
- Ranking-näkymä kaikkien alueiden vertailuun
- Erillinen metodologiasivu laskentakaavoille

Mukana on dataa Helsingistä, Espoosta, Vantaalta ja Kauniaisista.

## Tekninen toteutus

Projekti on rakennettu Viten päälle ja käyttää D3:ta kartan piirtämiseen.

- [`index.html`](./index.html) lataa sovelluksen rungon
- [`src/main.js`](./src/main.js) hakee datan ja alustaa sovelluksen
- [`src/map.js`](./src/map.js) piirtää kartan ja hoitaa zoomauksen
- [`src/modes.js`](./src/modes.js) sisältää pisteytyksen ja väriskaalat
- [`src/sidebar.js`](./src/sidebar.js) rakentaa aluepaneelin ja selitteen
- [`src/ranking.js`](./src/ranking.js) rakentaa ranking-näkymän
- [`public/data`](./public/data) sisältää selaimessa ladattavat JSON-aineistot
- [`public/metodologia.html`](./public/metodologia.html) sisältää laskentakaavojen kuvauksen

Nykyinen frontend ei tarvitse backendiä tai erillisiä API-avaimia.

## Kehitys

Asenna riippuvuudet:

```bash
npm install
```

Käynnistä kehityspalvelin:

```bash
npm run dev
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

## Data

Sovellus lataa seuraavat aineistot selaimessa:

- `public/data/geo.json` - GeoJSON-äänestysalueet ja aluekohtaiset ominaisuudet
- `public/data/elected_vertaus.json` - valittujen ehdokkaiden vertailutiedot
- `public/data/a_alueet.json` - A-alueiden koontidata
- `public/data/libe_per_area.json` - LIBE-ehdokas alueittain
- `public/data/convert_targets.json` - konversiokohteet alueittain
- `public/data/elected_area_votes.json` - valittujen ehdokkaiden äänet alueittain

Äänestysdata pohjautuu Oikeusministeriön vaalituloksiin.
