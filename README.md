# vscode-data-preview
[VSCode](https://github.com/Microsoft/vscode) Data Preview extension for viewing, slicing and dicing 
large `.csv`, `.xlsx`, `.json` array, `.arrow` and `.parquet` data files with [Perspective](https://perspective.finos.org/) - streaming analytics WebAssembly library.

![Data Preview](https://github.com/RandomFractals/vscode-data-preview/blob/master/images/vscode-data-preview.png?raw=true 
"Data Preview")

## Data Preview Launch Tips: 

1. Hit `Ctrl+Shift+D` in an open text `.csv` or `.json` array data file document to launch Data Preview panel.
2. Hit `Ctrl+S` or `File -> Save` your `.csv` or `.json` array data file for updates in open Data Preview panel.
3. Right-click on a binary `.xlsx` or `.arrow` data file in vscode File Explorer to launch Data Preview panel.
4. Use exposed `editor/title` or `editor/title/context` context menu options to Preview your data files.

## Data Grid/Filter/Columns UX Tips:

1. Double click on the grid column header to `Sort` data by that column.
2. Drag and drop a column from the left-side `Columns` control panel into `Filter fields` for data filtering 
(`Group By`, `Split By`, `Sort`, `Filter`).
3. Drag columns up and down in the left-side `Columns` control panel to reorder displayed columns in the Data Grid.
4. Uncheck a column in the `Columns` control panel to remove it from a Chart or Data Grid display.

# MVP Features

- `CSV`, `XLSX`, `JSON array`, and `Arrow` data files preview, sorting and filtering
- Grid data summary display with Aggregate Functions, row and column pivots (a.k.a. `Group By` and `Split By`)
- Basic Charts auto-gen from data with Aggregate Functions, row and column pivots
- Pluggable charting libraries for stock Charts: [highcharts](https://www.highcharts.com/demo) or [d3fc](https://d3fc.io/)
- Dark and Light Data Preview panel themes
- Persistent Data Preview settings (sort, filter, pivots, etc.) for restore on vscode reload

![Perspective Viewer](https://github.com/RandomFractals/vscode-data-preview/blob/master/images/perspective-viewer.gif?raw=true 
"Perspective Viewer")

# Next V.

- Will include large data files support and [Apache Arrow](https://observablehq.com/@randomfractals/apache-arrow) data streaming.

# Installation

Install this [Data Preview](https://marketplace.visualstudio.com/items?itemName=RandomFractalsInc.vscode-data-preview) via vscode Extensions tab (`Ctrl+Shift+X`) by searching for `data preview`, or via [vscode marketplace search results](https://marketplace.visualstudio.com/search?term=data%20preview&target=VSCode&category=All%20categories&sortBy=Relevance). 

List of Data Preview extension vscode contributions, with `data.preview` command, keyboard shortcut, augmented menu contexts for `csv` and `json` array data file previews, and configurable theme and charts data preview settings:

![Data Preview Contributions](https://github.com/RandomFractals/vscode-data-preview/blob/master/images/vscode-data-preview-contributions.png?raw=true 
"Data Preview Contributions")

# Configuration
[Create User or Workspace Settings in vscode](http://code.visualstudio.com/docs/customization/userandworkspace#_creating-user-and-workspace-settings) to change default Data Preview extension settings:

Setting | Type | Default Value | Description
------- | ---- | ------------- | -----------
data.preview.theme | string |  | Data Preview theme: blank for light, or '.dark' for dark theme data previews display.
data.preview.charts.plugin | string | hightcharts | Data Preview charts library to use for stock charts: [highcharts](https://www.highcharts.com/demo) or [d3fc](https://d3fc.io/)

Data Preview using `.dark` theme with `d3fc` charts config, viewing 
[superstore](https://github.com/finos/perspective/blob/master/examples/simple/superstore.arrow)`.arrow` data file :)

![Data Preview Dark](https://github.com/RandomFractals/vscode-data-preview/blob/master/images/vscode-data-preview-dark.png?raw=true 
"Data Preview Dark")


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

See [#DataPreview tag on Twitter](https://twitter.com/hashtag/datapreview?f=tweets&vertical=default&src=hash) for the latest and greatest updates on this vscode extension and what's in store next.

# Dev Build

```bash
$ git clone https://github.com/RandomFractals/vscode-data-preview
$ cd vscode-data-preview
$ npm install
$ code .
```
`F5` to launch Data Preview extension VSCode debug session.

# Contributions

Any and all test, code or feedback contributions are welcome. 

Open an issue or create a pull request to make this Data Preview extension work better for all. 