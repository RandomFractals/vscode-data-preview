# vscode-data-preview
[![](https://vsmarketplacebadge.apphb.com/version/RandomFractalsInc.vscode-data-preview.svg)](https://marketplace.visualstudio.com/items?itemName=RandomFractalsInc.vscode-data-preview)
[![](https://vsmarketplacebadge.apphb.com/downloads/RandomFractalsInc.vscode-data-preview.svg)](https://marketplace.visualstudio.com/items?itemName=RandomFractalsInc.vscode-data-preview)
[![](https://vsmarketplacebadge.apphb.com/installs/RandomFractalsInc.vscode-data-preview.svg)](https://marketplace.visualstudio.com/items?itemName=RandomFractalsInc.vscode-data-preview)
[![](https://vsmarketplacebadge.apphb.com/trending-monthly/RandomFractalsInc.vscode-data-preview.svg)](https://marketplace.visualstudio.com/items?itemName=RandomFractalsInc.vscode-data-preview)
[![](https://vsmarketplacebadge.apphb.com/trending-weekly/RandomFractalsInc.vscode-data-preview.svg)](https://marketplace.visualstudio.com/items?itemName=RandomFractalsInc.vscode-data-preview)
[![](https://vsmarketplacebadge.apphb.com/trending-daily/RandomFractalsInc.vscode-data-preview.svg)](https://marketplace.visualstudio.com/items?itemName=RandomFractalsInc.vscode-data-preview)


[VSCode](https://github.com/Microsoft/vscode) Data Preview 🈸 extension for viewing 🔎 slicing 🔪 dicing 🎲 & charting 📊 large flat `.json` array `.arrow` `.avro` data files, `.config` `.env` `.properties` `.ini` `.yml` configurations files, `.csv/.tsv` & `.xlsx/.xlsm` data files with [Perspective](https://perspective.finos.org/) - streaming data analytics WebAssembly library.

![Data Preview](https://github.com/RandomFractals/vscode-data-preview/blob/master/images/vscode-data-preview.png?raw=true 
"Data Preview")

# Data Preview 🈸 Features

- Preview 🈸 flat `.json` `.arrow` `.avro` `.yml` `.csv/.tsv` & `.xlsx/.xlsm` data files in a Data Grid w/Sorting & Filtering
- Grid Data Summary display w/Aggregate Functions, Row & Column Pivots (a.k.a. `Group By` & `Split By`)
- Basic Charts 📊 creation w/Aggregate Functions, Row & Column Pivots
- Pluggable Charting 📊 libraries for bult-in Charts: [d3fc](https://d3fc.io/) || [highcharts](https://www.highcharts.com/demo)
- Persistent Data Preview Settings (View, Sort, Filter, Pivots, etc.) for restore of open Data View panels on VSCode Reload
- Mulptiple Spreadsheets Data Preview for `Excel` data files
- Data `.schema.json` generation for Arrow & Avro Data Schema Text Previews in JSON format 
- Binary Data files `.json` generation for Arrow, Avro & `Excel` formats for Text Data Preview
- Property Grid display for `.json` `.config` `.env` `.properties` `.ini` & `.yml` configuration files
- Open Data Preview on Side option for slim data || config files
- Save Filtered Data Grid || Chart 📊 Data in `.csv` `.json(s)` `.yml` & `.properties` formats
- Save & Load Data View `.config` options
- Dark & Light Data Preview 🈸 Panel Themes

![Perspective Viewer](https://github.com/RandomFractals/vscode-data-preview/blob/master/images/perspective-viewer.gif?raw=true 
"Perspective Viewer")

# Next V.

- Will include `.parquet` data format support, large text & binary data files loading & [Apache Arrow](https://observablehq.com/@randomfractals/apache-arrow) data streaming

**Note:** Data Preview 🈸 is already capable of loading 10+MB's large data files with 100+K records & extensive list of supported Data Formats you'll be hard pressed to find on 
[VSCode marketplace](https://marketplace.visualstudio.com/search?term=data&target=VSCode&category=All%20categories&sortBy=Relevance) in one extension.

# Installation

Install [Data Preview](https://marketplace.visualstudio.com/items?itemName=RandomFractalsInc.vscode-data-preview) 🈸 via vscode Extensions tab (`Ctrl+Shift+X`) by searching for `data preview` || via [VSCode marketplace search results](https://marketplace.visualstudio.com/search?term=data%20preview&target=VSCode&category=All%20categories&sortBy=Relevance). 

List of Data Preview 🈸 extension config Settings, `data.preview` command(s), keyboard shortcut(s), augmented vscode UI context menus, added Data Language mappings, supported Data Files list & configurable Theme & Charts 📊 Settings:

![Data Preview Contributions](https://github.com/RandomFractals/vscode-data-preview/blob/master/images/vscode-data-preview-contributions.png?raw=true 
"Data Preview Contributions")

# Configuration
[Create User or Workspace Settings in vscode](http://code.visualstudio.com/docs/customization/userandworkspace#_creating-user-and-workspace-settings) to change default Data Preview 🈸 extension Settings:

Setting | Type | Default Value | Description
------- | ---- | ------------- | -----------
data.preview.theme | string |  | Data Preview Theme: blank for light or `.dark` for dark theme data previews display.
data.preview.charts.plugin | string | d3fc | Data Preview Charts 📊 library to use for built-in charts: [d3fc](https://d3fc.io/) or [highcharts](https://www.highcharts.com/demo)
data.preview.create.json.files | boolean | true | Creates `.json` data & `.schema.json` files, if available, for Arrow, Avro & Excel data files.

Data Preview 🈸 example using `.dark` theme with `d3fc` charts config, viewing 
[superstore](https://github.com/finos/perspective/blob/master/examples/simple/superstore.arrow)`.arrow` data file :)

![Data Preview Dark](https://github.com/RandomFractals/vscode-data-preview/blob/master/images/vscode-data-preview-dark.png?raw=true 
"Data Preview Dark")

# Usage Tips

## Data Preview 🈸 Launch Tips

1. Run `View -> Command Palette...>Data: Preview Data 🈸` command || `Ctrl+Shift+D` in an open 
`.json` `.config` `.env` `.properties` `.ini` `.yml` || `.csv/.tsv` text  data file document to launch Data Preview panel.
2. `File -> Save` (`Ctrl+S`) your text data file for immediate updates in an open Data Preview panel.
3. Right-click on a Binary `.xlsx/.xlsm`, `.arrow` || `.avro` data file in VSCode File Explorer to launch Data Preview panel.
4. Use exposed `explorer/context`, `editor/title` || `editor/title/context` Preview Data 🈸 || Preview Data on Side context menu options to preview your data files.
5. Click on the Data View Filename toolbar link to Load saved Data View Grid || Chart 📊 `.config`.
6. Click on the Data View 🈸 icon to Launch new Data Preview Panel for new view config changes.

## Data Grid/Filter/Columns UX Tips

1. Double click on the Grid Column header to `Sort` data by that column.
2. Drag and drop a column from the left-side `Columns` control panel into `Filter fields` for data filtering 
(`Group By`, `Split By`, `Sort`, `Filter`).
3. Drag columns up and down in the left-side `Columns` control panel to reorder displayed columns in the Data Grid.
4. Uncheck a column in the `Columns` control panel to remove it from a Chart 📊 or Data Grid display.

# Supported JSON, Config, Binary & Excel Data File Formats

```js
{
  "when": "resourceFilename =~ /.*\\.(json|arrow|arr|avro|env|config|properties|ini|yml|csv|tsv|txt|tab|dif|ods|prn|slk|xls|xlsb|xlsx|xlsm|xml|html)/",
  "command": "data.preview",
  "group": "navigation"
}
```

See https://github.com/SheetJS/js-xlsx#file-formats for more info on supported `Excel` file formats.

![Data Preview Data](https://github.com/RandomFractals/vscode-data-preview/blob/master/images/vscode-data-preview-data.png?raw=true 
"Data Preview Data")

## Provided Chart 📊 Types

- Area Chart
- Bar 
- Candlesick Chart (`d3fc` only))
- Heatmap
- Line Chart
- OHLC Chart (`d3fc` only)
- Scatter Chart
- Sunburst
- Tree Map

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

# Dev Log

See [#DataPreview 🈸 tag on Twitter](https://twitter.com/hashtag/datapreview?f=tweets&vertical=default&src=hash) for the latest and greatest updates on this vscode extension and what's in store next.

# Dev Build

```bash
$ git clone https://github.com/RandomFractals/vscode-data-preview
$ cd vscode-data-preview
$ npm install
$ code .
```
`F5` to launch Data Preview 🈸 extension VSCode debug session.

||

```bash
vscode-data-preview>vsce package
```
to generate `VSIX` Data Preview 🈸 extension package from our latest for local dev install in VSCode.

# Contributions

Any and all test, code or feedback contributions are welcome. 

Open an issue or create a pull request to make this Data Preview 🈸 extension work better for all. 