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

## Datan lähteet

Projektissa käytetään kolmea ulkoista lähdettä:

- [Oikeusministeriö / Tieto- ja tulospalvelu, Eduskuntavaalit 2023](https://tulospalvelu.vaalit.fi/EKV-2023/fi/index.html)
  - puolue- ja ehdokastason vaalitulokset äänestysalueittain
- [Helsinki Region Infoshare: Pääkaupunkiseudun äänestysaluejako](https://hri.fi/data/fi/dataset/paakaupunkiseudun-aanestysaluejako)
  - äänestysalueiden rajat Helsingissä, Espoossa, Vantaalla ja Kauniaisissa
  - HRI:n aineistokuvauksen mukaan vuosien 2024-25 äänestysaluejako on sama kuin vuonna 2023, joten samaa geometriaa voidaan käyttää vuoden 2023 vaalitulosten kanssa
- [Maanmittauslaitos: Hallinnolliset aluejaot, vektori](https://www.maanmittauslaitos.fi/kartat-ja-paikkatieto/aineistot-ja-rajapinnat/tuotekuvaukset/hallinnolliset-aluejaot-vektori)
  - kuntarajat kartan overlay-kerrosta varten

## Projektin data

Sovellus lataa selaimessa seuraavat JSON-aineistot:

- `public/data/geo.json`
  - projektissa koottu GeoJSON, joka yhdistää HRI:n äänestysaluegeometrian ja Oikeusministeriön vuoden 2023 vaalitulokset
- `public/data/a_alueet.json`
  - `geo.json`:sta johdettu A-alueiden koontidata
- `public/data/elected_vertaus.json`
  - Oikeusministeriön tulospalvelun valittujen ehdokkaiden vertailutiedot
- `public/data/libe_per_area.json`
  - Oikeusministeriön ehdokaskohtaisista äänestysaluetuloksista johdettu LIBE-ehdokkaiden aluekohtainen näkymä
- `public/data/convert_targets.json`
  - Oikeusministeriön ehdokaskohtaisista äänestysaluetuloksista johdettu kohdelista
- `public/data/elected_area_votes.json`
  - Oikeusministeriön ehdokaskohtaisista äänestysaluetuloksista johdettu valittujen ehdokkaiden aluekohtainen yhteenveto
- `public/data/municipal_borders.json`
  - Maanmittauslaitoksen hallinnollisista aluejaoista irrotettu PKS-kuntien rajakerros

Repossa on lisäksi apuaineisto `public/helsinki_votes.json`, joka sisältää Helsingin ehdokaskohtaisia alueääniä Oikeusministeriön tulospalvelusta. Sitä ei tällä hetkellä ladata sovelluksessa.
