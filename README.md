# vscode-data-preview
[VSCode](https://github.com/Microsoft/vscode) Data Preview 🈸 extension for viewing, slicing & dicing 
large `.csv/.tsv`, `.xlsx/.xlsm`, `.json` array, `.arrow`, `.avro` & `.parquet` data files with [Perspective](https://perspective.finos.org/) - streaming data analytics WebAssembly library.

![Data Preview](https://github.com/RandomFractals/vscode-data-preview/blob/master/images/vscode-data-preview.png?raw=true 
"Data Preview")

# Data Preview 🈸 MVP Features

- `CSV/TSV`, `XLSX/XLSM`, `JSON array`, `Arrow` & `Avro` data files Preview, Sorting & Filtering
- Grid Data summary display with Aggregate Functions, Row & Column Pivots (a.k.a. `Group By` & `Split By`)
- Basic Charts auto-gen from data with Aggregate Functions, Row & Column Pivots
- Pluggable Data Charting libraries for stock Charts: [highcharts](https://www.highcharts.com/demo) || [d3fc](https://d3fc.io/)
- Dark & Light Data Preview 🈸 Panel Themes
- Persistent Data Preview 🈸 Settings (Sort, Filter, Pivots, etc.) for restore on vscode Reload

![Perspective Viewer](https://github.com/RandomFractals/vscode-data-preview/blob/master/images/perspective-viewer.gif?raw=true 
"Perspective Viewer")

# Next V.

- Will include `.parquet` data format support, large text & binary data files loading & [Apache Arrow](https://observablehq.com/@randomfractals/apache-arrow) data streaming.

**Note:** this Data Preview 🈸 MVP v. is already capable of loading a few MB's large data files with 100+K records & extensive list of supported data formats you'll be hard pressed to find on vscode marketplace.

# Installation

Install this [Data Preview](https://marketplace.visualstudio.com/items?itemName=RandomFractalsInc.vscode-data-preview) 🈸 via vscode Extensions tab (`Ctrl+Shift+X`) by searching for `data preview` || via [vscode marketplace search results](https://marketplace.visualstudio.com/search?term=data%20preview&target=VSCode&category=All%20categories&sortBy=Relevance). 

List of Data Preview 🈸 extension vscode contributions, with `data.preview` command, keyboard shortcut, augmented vscode UI context menus, added data language mappings, supported data files list & configurable theme & charts Data Preview 🈸 Settings:

![Data Preview Contributions](https://github.com/RandomFractals/vscode-data-preview/blob/master/images/vscode-data-preview-contributions.png?raw=true 
"Data Preview Contributions")

# Configuration
[Create User or Workspace Settings in vscode](http://code.visualstudio.com/docs/customization/userandworkspace#_creating-user-and-workspace-settings) to change default Data Preview 🈸 extension Settings:

Setting | Type | Default Value | Description
------- | ---- | ------------- | -----------
data.preview.theme | string |  | Data Preview theme: blank for light, or '.dark' for dark theme data previews display.
data.preview.charts.plugin | string | hightcharts | Data Preview 🈸 charts library to use for stock charts: [highcharts](https://www.highcharts.com/demo) or [d3fc](https://d3fc.io/)

Data Preview 🈸 example using `.dark` theme with `d3fc` charts config, viewing 
[superstore](https://github.com/finos/perspective/blob/master/examples/simple/superstore.arrow)`.arrow` data file :)

![Data Preview Dark](https://github.com/RandomFractals/vscode-data-preview/blob/master/images/vscode-data-preview-dark.png?raw=true 
"Data Preview Dark")

# Usage Tips

## Data Preview 🈸 Launch Tips

1. Run `View -> Command Palette...>Data: Preview Data 🈸` command || hit `Ctrl+Shift+D` in an open text `.csv/.tsv` || `.json` array data file document to launch Data Preview 🈸 panel.
2. Hit `Ctrl+S` || `File -> Save` your `.csv/.tsv` || `.json` array data file for updates in open Data Preview 🈸 panel.
3. Right-click on a binary `.xlsx/.xlsm`, `.arrow` || `.avro` data file in vscode File Explorer to launch Data Preview 🈸 panel.
4. Use exposed `explorer/context`, `editor/title` || `editor/title/context` context menu options to Preview 🈸 your data files.

## Data Grid/Filter/Columns UX Tips

1. Double click on the Grid Column header to `Sort` data by that column.
2. Drag and drop a column from the left-side `Columns` control panel into `Filter fields` for data filtering 
(`Group By`, `Split By`, `Sort`, `Filter`).
3. Drag columns up and down in the left-side `Columns` control panel to reorder displayed columns in the Data Grid.
4. Uncheck a column in the `Columns` control panel to remove it from a Chart or Data Grid display.

# Supported Excel & Other Binary Data Formats

```js
{
  "when": "resourceFilename =~ /.*\\.(csv|tsv|txt|tab|dif|ods|prn|slk|xls|xlsb|xlsx|xlsm|xml|html|json|arrow|arr|avro|parquet|parq)/",
  "command": "data.preview",
  "group": "navigation"
}
```

See https://github.com/SheetJS/js-xlsx#file-formats for more info on supported `Excel` file formats.

![Data Preview Data](https://github.com/RandomFractals/vscode-data-preview/blob/master/images/vscode-data-preview-data.png?raw=true 
"Data Preview Data")

## Provided Chart Types

- Area Chart
- Bar Chart
- Heatmap
- Line Chart
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

# Contributions

Any and all test, code or feedback contributions are welcome. 

Open an issue or create a pull request to make this Data Preview 🈸 extension work better for all. 