# vscode-data-preview
[![Build Status](https://travis-ci.org/HoangNguyen17193/vscode-simple-rest-client.svg?branch=master)](https://travis-ci.com/RandomFractals/vscode-data-preview)
[![Apache-2.0 License](https://img.shields.io/badge/license-Apache2-orange.svg?color=green)](http://opensource.org/licenses/Apache-2.0)
<a href='https://ko-fi.com/F1F812DLR' target='_blank' title='support: https://ko-fi.com/dataPixy'>
  <img height='24' style='border:0px;height:20px;' src='https://az743702.vo.msecnd.net/cdn/kofi3.png?v=2' alt='https://ko-fi.com/dataPixy' /></a>

[![Version](https://vsmarketplacebadge.apphb.com/version/RandomFractalsInc.vscode-data-preview.svg?color=orange&style=?style=for-the-badge&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=RandomFractalsInc.vscode-data-preview)
[![Installs](https://vsmarketplacebadge.apphb.com/installs/RandomFractalsInc.vscode-data-preview.svg?color=orange)](https://marketplace.visualstudio.com/items?itemName=RandomFractalsInc.vscode-data-preview)
[![Downloads](https://vsmarketplacebadge.apphb.com/downloads/RandomFractalsInc.vscode-data-preview.svg?color=orange)](https://marketplace.visualstudio.com/items?itemName=RandomFractalsInc.vscode-data-preview)

[![Trending-Weekly](https://vsmarketplacebadge.apphb.com/trending-weekly/RandomFractalsInc.vscode-data-preview.svg?logo=tinder&logoColor=white&label=trending%20weekly)](https://marketplace.visualstudio.com/items?itemName=RandomFractalsInc.vscode-data-preview) [![Trending-Monthly](https://vsmarketplacebadge.apphb.com/trending-monthly/RandomFractalsInc.vscode-data-preview.svg?logo=tinder&logoColor=white&label=monthly)](https://marketplace.visualstudio.com/items?itemName=RandomFractalsInc.vscode-data-preview)

[Data Preview 🈸](https://marketplace.visualstudio.com/items?itemName=RandomFractalsInc.vscode-data-preview) extension for importing 📤 viewing 🔎 slicing 🔪 dicing 🎲  charting 📊 & exporting 📥 **large** `.json` array `.arrow` `.avro` `.parquet` data files, `.config` `.env` `.properties` `.ini` `.yml` configurations files, `.csv/.tsv` & `.xlsx/.xlsb` Excel files and `.md` markdown tables with [Perspective](https://perspective.finos.org/) - streaming data analytics WebAssembly library.

![Data Preview](https://github.com/RandomFractals/vscode-data-preview/blob/master/images/vscode-data-preview.png?raw=true 
"Data Preview")

# 🈸 Features

- Preview `.json` `.arrow` `.avro` `.parquet` `.yml` `.csv/.tsv` & `.xlsx/.xlsb` data files in a Data Grid w/Sorting & Filtering
- Grid Data Summary display w/Aggregate Functions, Row & Column Pivots (a.k.a. `Group By` & `Split By`)
- Basic Charts 📊 creation w/Aggregate Functions, Row & Column Pivots
- Pluggable Charting 📊 libraries for bult-in Charts: [d3fc](https://d3fc.io/) || [highcharts](https://www.highcharts.com/demo)
- Persistent Data Preview Settings (View, Sort, Filter, Pivots, etc.) for restore of open Data View panels on VSCode Reload
- Mulptiple Spreadsheets Data Preview for `Excel` data files
- Markdown tables data preview for `.md` documentation files
- Data `.schema.json` generation for Arrow & Avro Data Schema Text Previews in JSON format 
- Binary Data files `.json` generation for Arrow, Avro & `Excel` formats for Text Data Preview
- Property Grid display for `.json` `.config` `.env` `.properties` `.ini` & `.yml` configuration files
- Open Data Preview on Side option for slim data || config files
- Quick Launch new Data Preview input box for data files in open workspace
- Save Filtered Data Grid || Chart 📊 Data in `.arrow` `.csv` `.json(s)` `.yml` & `.properties` formats
- Save & Load Data View `.config` options
- Dark, Light, Dense & High Contrast Blue Data Preview 🈸 Panel UI Themes

# Next V.

- Will include large text & binary data files loading & [Apache Arrow](https://observablehq.com/@randomfractals/apache-arrow) data streaming.

**Note:** Data Preview 🈸 is already capable of loading a few 10+MB's large data files with 100+K records & extensive list of [supported Data Formats](https://github.com/RandomFractals/vscode-data-preview#supported-json-config-binary--excel-data-file-formats) you'll be hard pressed to find on 
[VSCode marketplace](https://marketplace.visualstudio.com/search?term=data&target=VSCode&category=All%20categories&sortBy=Relevance) in one extension. 

See [data/large/...](https://github.com/RandomFractals/vscode-data-preview/tree/master/data/large) data folder for sample large data files and Data View `.config`s you can try in Data Preview 🈸.

# Installation

Install [Data Preview](https://marketplace.visualstudio.com/items?itemName=RandomFractalsInc.vscode-data-preview) 🈸 via vscode Extensions tab (`Ctrl+Shift+X`) by searching for `data preview` || via [VSCode marketplace search results](https://marketplace.visualstudio.com/search?term=data%20preview&target=VSCode&category=All%20categories&sortBy=Relevance). 

List of Data Preview 🈸 extension config Settings, `data.preview` command(s), keyboard shortcut(s), augmented vscode UI context menus, added Data Language mappings, supported Data Files list & configurable Theme & Charts 📊 Settings:

![Data Preview Contributions](https://github.com/RandomFractals/vscode-data-preview/blob/master/images/vscode-data-preview-contributions.png?raw=true 
"Data Preview Contributions")

# Configuration
[Create User or Workspace Settings in vscode](http://code.visualstudio.com/docs/customization/userandworkspace#_creating-user-and-workspace-settings) to change default Data Preview 🈸 extension Settings:

| Setting | Type | Default Value | Description |
| ------- | ---- | ------------- | ----------- |
| data.preview.theme | string | dark | Data Preview UI Theme: `dark`, `light`, `dense.light`, `dense.dark`, or `vaporwave` (hight contrast blue theme) |
| data.preview.charts.plugin | string | d3fc | Data Preview Charts 📊 library to use for built-in charts: [d3fc](https://d3fc.io/) or [highcharts](https://www.highcharts.com/demo) |
| data.preview.create.json.files | boolean | false | Creates `.json` data files for Arrow, Avro & Excel binary data formats |
| data.preview.create.json.schema | boolean | true | Creates `.schema.json` files for Arrow & Avro metadata binary data formats |
| data.preview.openSavedFileEditor | boolean | true | Opens created data file Content Editor on Data Save |
| data.preview.log.level | string | `info` | Data Preview run log level: `info` or `debug` for issues troubleshooting |

Data Preview 🈸 example using `dark` UI theme with `d3fc` Charts 📊 Data View `config`, viewing 
[superstore](https://github.com/finos/perspective/blob/master/examples/simple/superstore.arrow)`.arrow` data file :)

![Data Preview Dark](https://github.com/RandomFractals/vscode-data-preview/blob/master/images/vscode-data-preview-dark.png?raw=true 
"Data Preview Dark")

# Usage Tips

## Data Preview 🈸 Launch Tips

1. Run `View -> Command Palette...>Data: Preview Data` command or `Ctrl+Shift+D` in an open 
`.json` `.config` `.env` `.properties` `.ini` `.yml` or `.csv/.tsv` text  data file document to launch Data Preview panel.
2. `File -> Save` (`Ctrl+S`) your text data file for immediate updates in an open Data Preview 🈸 panel.
3. Right-click on a Binary `.xlsx/.xlsb`, `.arrow` or `.avro` data file in VSCode File Explorer to launch Data Preview panel.
4. Use exposed `explorer/context`, `editor/title` or `editor/title/context` Preview Data 🈸 or Preview Data on Side context menu options to preview your data files.
5. Click on the Data View Filename toolbar link to Load saved Data View Grid || Chart 📊 `.config`.
6. Click on the Data View 🈸 icon to Launch new Data Preview Panel for new view config changes.
7. Use Open Data File or URL 📤 option from Data View toolbar to launch new Data Preview 🈸.
8. Run `View -> Command Palette...>Data: Preview Remote Data` command or `Ctrl+Shift+R`
to launch Data Preview for remote `http(s)` data files.

![Data Preview Open Data File](https://github.com/RandomFractals/vscode-data-preview/blob/master/images/vscode-data-preview-open-file.png?raw=true 
"Data Preview Open Data File")

## Data Grid/Filter/Columns UX Tips

1. Double click on the Grid Column header to `Sort` data by that column.
2. Drag and drop a column from the left-side `Columns` control panel into `Filter fields` for data filtering 
(`Group By`, `Split By`, `Sort`, `Filter`).
3. Drag columns up and down in the left-side `Columns` control panel to reorder displayed columns in the Data Grid.
4. Uncheck a column in the `Columns` control panel to remove it from a Chart 📊 or Data Grid display.

# Usage Scenarios

Use Data Preview 🈸 to:

- Load large data files for sorting, filtering & charting 📊 
- Export displayed data in a compact binary `.arrow` data format, `.ods` `.xlsb` || `.xlsx` spreadsheet format, or `.csv` `.json` `.yml` `.md` or `.properties` text formats
- Preview `.properites` and other key-value pairs configuration files to reformat them or find set config option values
- Generate Arrow & Avro `.shema.json` for metadata text preview of those binary data files
- Generate `.json` files for text data preview of binary Excel files
- Preview Excel files and workbooks with multiple workseets without opening Excel
- Convert `.csv` or `.tsv` data to `.json` or `.yml` format
- Extract, sort, filter and save markdown tables from `.md` documentation files
- Use built-in Charts 📊 for Exploratory Data Analysis

# Supported JSON, Config, Binary & Excel Data File Formats

**Tip**: try sample data and Data View `.config` files from this repository [data/...](https://github.com/RandomFractals/vscode-data-preview/tree/master/data) folders: 
[`data/arrow`](https://github.com/RandomFractals/vscode-data-preview/tree/master/data/arrow) 
[`data/avro`](https://github.com/RandomFractals/vscode-data-preview/tree/master/data/avro)
[`data/parquet`](https://github.com/RandomFractals/vscode-data-preview/tree/master/data/parquet)
[`data/config`](https://github.com/RandomFractals/vscode-data-preview/tree/master/data/config)
[`data/excel`](https://github.com/RandomFractals/vscode-data-preview/tree/master/data/excel)
[`data/json`](https://github.com/RandomFractals/vscode-data-preview/tree/master/data/json)
[`data/yaml`](https://github.com/RandomFractals/vscode-data-preview/tree/master/data/yaml)
[`data/large`](https://github.com/RandomFractals/vscode-data-preview/tree/master/data/large)

[Vega datasets](https://github.com/vega/vega-datasets) repository also has a broad collection of sample `.csv` & `.json` array data files you can try in Data Preview 🈸

## Data Preview 🈸 Files Matching Rules

```js
{
  "when": "resourceFilename =~ /.*\\.(json|jsonl|json5|hjson|ndjson|arrow|arr|avro|parquet|env|config|properties|ini|yml|md|csv|tsv|txt|tab|dif|ods|xls|xlsb|xlsx|xlsm|xml|html)/",
  "command": "data.preview",
  "group": "navigation"
}
```

## Data Preview 🈸 Files Loading Details

**Note:** `.json` `.config` & `.yml` configuration files that don't contain array data are converted to
flat properties key/value pairs Object and displayed in a Property Grid Data View mode. 
See [json.utils.ts](https://github.com/RandomFractals/vscode-data-preview/blob/master/src/utils/json.utils.ts)
for more info.

| Data File Extension(s) | File Type | Data Parsing Library/Method Used | Data Format Specification |
| --- | --- | --- | --- |
| `.json` `.config` `.jsonl` `.ndjson` | text | [`JSON.parse()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse) | https://json.org/ |
| `.json5` | text | [json5](https://github.com/json5/json5)/[`JSON5.parse()`](https://github.com/json5/json5#json5parse) | https://json5.org/ |
| `.hjson` | text | [hjson-js](https://github.com/hjson/hjson-js)/[`Hjson.parse()`](https://github.com/hjson/hjson-js#hjsonparsetext-options) | https://hjson.org/ |
| `.arrow` `.arr` | binary | [apache-arrow](https://github.com/apache/arrow/tree/master/js)/[`Table.from()`](https://github.com/apache/arrow/tree/master/js#get-a-table-from-an-arrow-file-on-disk-in-ipc-format) | https://arrow.apache.org/ |
| `.parquet` | binary | [parquets](https://github.com/kbajalc/parquets)/[`parquets/ParquetReader.openFile()`](https://github.com/kbajalc/parquets#usage-reading-files) | https://parquet.apache.org/documentation/latest/ |
| `.properties` `.env` | text | [node-properties](https://github.com/gagle/node-properties)/[`properties.parse()`](https://github.com/gagle/node-properties#parse) | https://en.wikipedia.org/wiki/.properties |
| `.ini` | text | [node-properties](https://github.com/gagle/node-properties)/[`properties.parse()`](https://github.com/gagle/node-properties#ini) | https://en.wikipedia.org/wiki/INI_file |
| `.md` | text | [RegExp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp)/[`markdownToCsv()`](https://github.com/RandomFractals/vscode-data-preview/blob/f7d8db4062914822c3e74cfd6259a90cdc051b82/src/data.preview.ts#L1035)| https://en.wikipedia.org/wiki/Markdown | 
| `.yml` `.yaml` | text | [js-yaml](https://github.com/nodeca/js-yaml)/[`yaml.load()`](https://github.com/nodeca/js-yaml#load-string---options-) | https://yaml.org/ |
| `.csv` `.tsv` `.txt` `.tab` | text | [perspective](https://github.com/finos/perspective/)/[`perspectiveViewer.load(text)`](https://github.com/finos/perspective/tree/master/packages/perspective-viewer#module_perspective-viewer..PerspectiveViewer+load) | https://en.wikipedia.org/wiki/Comma-separated_values https://en.wikipedia.org/wiki/Tab-separated_values |
| `.dif` `.ods` `.xls` `.xlsb` `.xlsx` `.xlsm` `.xml` `.html` | binary/text | [js-xlsx](https://github.com/SheetJS/js-xlsx)/[`XLSX.read()`](https://github.com/SheetJS/js-xlsx#parsing-functions) | See https://github.com/SheetJS/js-xlsx#file-formats for more info on `Excel` file formats |

**See** [Data Manager API](https://github.com/RandomFractals/vscode-data-preview/blob/master/src/data.manager.ts) & [src/data.providers](https://github.com/RandomFractals/vscode-data-preview/tree/master/src/data.providers) folder for data loading and saving imlementation details.


## Provided Chart 📊 Types

- Area Chart
- Bar Chart
- Candlesick Chart (`d3fc` only))
- Heatmap
- Line Chart
- OHLC Chart (`d3fc` only)
- Scatter Chart
- Sunburst
- Tree Map

![Data Preview Chart Types](https://github.com/RandomFractals/vscode-data-preview/blob/master/images/vscode-data-preview-chart-types.png?raw=true 
"Data Preview Chart Types")

## Supported Filter Functions

- `<, <=, ==, !=, >, >=` for dates and number columns/fields
- `==, !=, contains, in, not in, begins with, ends with` for string fields and dictionaries
- `&, |, and, or, ==, !=` for bolean fields 

## Supported Aggregate Functions

- any
- avg
- count
- distinct count
- dominant
- first by index
- last by index
- last
- high
- low
- mean
- mean by count
- median
- pct sum parent
- pct sum grand total
- sum
- sum abs
- sum not null
- unique

# Recommended VSCode Extensions

Other extensions Data Preview 🈸 replaces, enhances or supplements for working with [supported data file formats](https://github.com/RandomFractals/vscode-data-preview#supported-json-config-binary--excel-data-file-formats) in VSCode:

| Extension | Description |
| --- | --- |
| [Excel Viewer](https://marketplace.visualstudio.com/items?itemName=GrapeCity.gc-excelviewer) | View Excel spreadsheets and CSV files |
| [Avro Viewer](https://marketplace.visualstudio.com/items?itemName=romiogaku.vscode-avro-viewer) | `.avro` file viewer |
| [avro-idl](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.avro) | Avro IDL Syntax Highlighter |
| [DotENV](https://marketplace.visualstudio.com/items?itemName=mikestead.dotenv) | `.env` Syntax Highlighter |
| [Ini for VSCode](https://marketplace.visualstudio.com/items?itemName=DavidWang.ini-for-vscode) | Provides outline view and section folding for INI files |
| [Hjson](https://marketplace.visualstudio.com/items?itemName=laktak.hjson) | Hjson language syntax support |
| [JSON5 syntax](https://marketplace.visualstudio.com/items?itemName=mrmlnc.vscode-json5) | Adds syntax highlighting of JSON5 files |
| [NDJSON Colorizer](https://marketplace.visualstudio.com/items?itemName=buster.ndjson-colorizer) | Colorizes NDJSON (Newline Delimited JSON) files |
| [YAML](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml) | YAML Language Support by Red Hat, with built-in Kubernetes and Kedge syntax support |
| [docs-yaml](https://marketplace.visualstudio.com/items?itemName=docsmsft.docs-yaml) | YAML schema validation and auto-completion for docs.microsoft.com authoring |
| [YAML to JSON](https://marketplace.visualstudio.com/items?itemName=ahebrank.yaml2json) | Convert YAML from clipboard or current document/selection to JSON and vice versa |
| [Properties To Yaml](https://marketplace.visualstudio.com/items?itemName=tanaka-x.prop2yaml) | Convert properties to yaml |
| [Markdown Table Prettifier](https://marketplace.visualstudio.com/items?itemName=darkriszty.markdown-table-prettify) | Transforms markdown tables to be more readable |

# Dev Log

See [#DataPreview 🈸 tag on Twitter](https://twitter.com/hashtag/datapreview?f=tweets&vertical=default&src=hash) for the latest and greatest updates on this vscode extension and what's in store next.

# Dev Build

```bash
$ git clone https://github.com/RandomFractals/vscode-data-preview
$ cd vscode-data-preview
$ npm install
$ code .
```
`F5` to launch Data Preview extension VSCode debug session.

||

```bash
vscode-data-preview>vsce package
```
to generate `VSIX` Data Preview extension package from our latest for local dev install in VSCode.

**Note:** Use `Help -> Toggle Developer Tools` vscode menu option to view Data Preview console log.

# Contributions

Any and all test, code or feedback contributions are welcome. 

Open an [issue](https://github.com/RandomFractals/vscode-data-preview/issues) or create a pull request to make this Data Preview 🈸 extension work better for all.

# Backers

| [<img src="https://sheetjs.com/sketch128.png" width="80">](https://sheetjs.com/) | [<img src="https://avatars2.githubusercontent.com/u/10234615?s=400&v=4" width="80">](https://amanhimself.dev/) |
|:-:|:-:|
| [SheetJS](https://sheetjs.com/) | [Aman Mittal](https://amanhimself.dev/) |

<a href='https://ko-fi.com/F1F812DLR' target='_blank'>
  <img height='36' style='border:0px;height:36px;' border='0'
    src='https://az743702.vo.msecnd.net/cdn/kofi3.png?v=2' 
    alt='support me on ko-fi.com' />
</a>
