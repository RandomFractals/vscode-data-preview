# vscode-data-preview
[VSCode](https://github.com/Microsoft/vscode) Data Preview extension for viewing, slicing and dicing 
large `csv`, `json` array, `arrow` and `parquet` data files with [Perspective](https://perspective.finos.org/) - streaming analytics WebAssembly library.

![Alt text](https://github.com/RandomFractals/vscode-data-preview/blob/master/images/vscode-data-preview.png?raw=true 
 "Data Preview")

# MVP Features

- CSV and JSON array data preview, sorting and filtering
- Grid data summary display with aggregate functions, row and column pivots
- Basic charts auto-gen from data with aggregate functions, row and column pivots

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


# Next V.

- Will include large data files support and [Apache Arrow](https://observablehq.com/@randomfractals/apache-arrow) data display and streaming.

- plus dark theme support. gotta have that! :)

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