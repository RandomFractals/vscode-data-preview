# vscode-data-preview
[VSCode](https://github.com/Microsoft/vscode) Data Preview extension for viewing, slicing and dicing 
large `.csv`, `.json` array, `.arrow` and `.parquet` data files with [Perspective](https://perspective.finos.org/) - streaming analytics WebAssembly library.

![Data Preview](https://github.com/RandomFractals/vscode-data-preview/blob/master/images/vscode-data-preview.png?raw=true 
"Data Preview")

## Usage Tips: 

1. Hit `Ctrl+Shift+D` in open `.csv` or `.json` array data file to launch Data Preview panel.
2. Hit `Ctrl+S` or Save your `.csv` or `.json` array data file for data refresh in open Data Preview panel.
3. Right-click on `.arrow` data file in vscode file explorer to lauch Data Preview for these binary data files.
4. Double click on the grid column header to sort data.
5. Drag and drop columns from the left-side columns panel into filter fields for data filtering (group by, split by, sort, filter).

# MVP Features

- CSV, JSON array, and Arrow data preview, sorting and filtering
- Grid data summary display with aggregate functions, row and column pivots (a.k.a. groupBy and splitBy)
- Basic charts auto-gen from data with aggregate functions, row and column pivots
- Pluggable charting libraries for stock charts: [highcharts](https://www.highcharts.com/demo) or [d3fc](https://d3fc.io/)
- Dark and light data preview panel themes
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