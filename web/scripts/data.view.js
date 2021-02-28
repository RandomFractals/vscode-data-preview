// data preview vars
let vscode, title, tableSelector, rowCounter,
	saveFileTypeSelector,
	dataViewConsoleText, dataUrlInput,
	dataUrl, dataFileName,
	viewer, theme,
	toggleConfig = true, restoringConfig = true,
	dataTable = '', dataViews = {}, tableNames = [], 
	viewConfig = {}, viewData = [], logLevel = 'info';

// check web assembly support
// console.log(`data.view:supportsWebAssembly(): ${supportsWebAssembly()}`);

// initialize vs code api for messaging
vscode = acquireVsCodeApi();

// add webview post message event handler
window.addEventListener('message', event => {
	switch (event.data.command) {
		case 'dataInfo':
			loadDataInfo(event.data);
			break;
		case 'refresh':
			refresh(event.data);
			break;
		default: // raw byte array
			// convert byte array to typed data array for loading into data view
			viewData = Uint8Array.from(event.data);
			logMessage(`data size in bytes: ${viewData.byteLength.toLocaleString()}`);
			// update data viewer
			viewer.load(viewData.buffer);
			updateStats();
			if (toggleConfig) {
				// show viewer toggles on the 1st run
				viewer.toggleConfig();
				toggleConfig = false;
				toggleDataViewConsoleDisplay();
			}
			break;
	}
});

// wire document load state changes
document.addEventListener('readystatechange', event => {
	switch (document.readyState) {
		case 'loading':
			logMessage(`loading: data url: ${dataUrl}`);
		break;
		case 'interactive':
			// document loading finished, images and stylesheets are still loading ...
			logMessage('interactive!');
			// get initial data info: document url, views, etc.
			vscode.postMessage({command: 'getDataInfo'});
			break;
		case "complete":
			// web page is fully loaded
			logMessage('document.readystatechange complete\n\n data.view:complete!');
			break;
	}      
});

// tag viewer loading
window.addEventListener('WebComponentsReady', event => {
	logMessage('window.WebComponentsReady\n\n data viewer initialized!');
});

// initialize data view on content loaded
document.addEventListener('DOMContentLoaded', event => initializeDataView());

/**
 * Initializes data view UI elements,
 * updates view state, config, and 
 * requests first data load for display.
 */
function initializeDataView() {
	// initialize toolbar & perspective data viewer
	logMessage('initializeDataView()\n\n initializing...');
	title = document.getElementById('title');
	dataViewConsoleText = document.getElementById('data-view-console-text');
	tableSelector = document.getElementById('table-selector');
	dataUrlInput = document.getElementById('data-url-input');
	saveFileTypeSelector = document.getElementById('save-file-type-selector');
	viewer = document.getElementsByTagName('perspective-viewer')[0];
	try {
		// request first data update
		vscode.postMessage({command: 'refresh'});

		// add view update handler
		viewer.addEventListener('perspective-view-update', event => {
			logMessage(`viewer.perspective-view-update...`);
			updateStats();
		});

		// add viewer config change handler for saving view state
		viewer.addEventListener('perspective-config-update', event => {
			if (!restoringConfig) {
				updateConfig();
			}
			updateStats();			
		});

		// add viewer click handler for cross-filtering
		viewer.addEventListener('perspective-click', event => {
			// TODO: experiment with this cross filter selection later
			// console.log(`data.view:dataClick(${dataTable}): detail=${event.detail.row} columns=${event.detail.column_names}`);
		});
	}
	catch (error) {
		console.error(`data.view:vscode:error ${error.message}`);
	}
} // end of initializeDataView()

/**
 * Updates data stats on view config changes or data load/update.
 */
function updateStats() {
	const numberOfRows = viewer.view ? viewer.view.num_rows() : viewer.table.size();
	// get rows count and displayed columns info
	numberOfRows.then(rowCount => {
		let columns = viewer['columns'];
		/*if (viewConfig.hasOwnProperty('columns')) {
			// use view config columns property instead
			columns = viewConfig['columns'].split('\",\"');
		}*/
		// notify webview for data stats status update
		vscode.postMessage({
			command: 'stats',
			columns: columns,
			rowCount: rowCount
		});
		logMessage(`updateStats()\n\n columns: ${columns}\n rows: ${rowCount.toLocaleString()}`);
	});
} // end of updateStats()

/**
 * Loads initial data view info.
 * @param data Data info with data url, views, etc.
 */
function loadDataInfo(data) {
	// initialize data view vars
	dataUrl = data.uri;
	dataFileName = data.fileName;
	dataTable = data.table;
	dataViews = data.views;
	viewConfig = data.config;
	theme = data.theme;
	logLevel = data.logLevel;

	logMessage(`loadDataInfo()\n\n data url: ${dataUrl}\n data table: ${dataTable}`);

	// update view config
	restoreConfig(viewConfig);
}

/**
 * Restores data view config on new data view load or new view config load.
 * @param viewConfig Data view config to restore.
 */
function restoreConfig(viewConfig) {
	// set updating view config flag
	restoringConfig = true;

	// restore view config
	logMessage(`restoreConfig(\n${JSON.stringify(viewConfig, null, 2)})`);
	viewer.restore(viewConfig);
	//updateStats();

	// clear updating view config flag
	restoringConfig = false;
}

/**
 * Updates view config caused by user interactions or new config load.
 */
function updateConfig() {
	// get latest view config state from data viewer
	const viewerConfig = viewer.save();
	
	// strip out updating, render time and style properties for clean view config compare and save
	deleteProperty('updating', viewerConfig);
	deleteProperty('render_time', viewerConfig);
	deleteProperty('style', viewerConfig);
	deleteProperty('class', viewerConfig);
	// logMessage(`viewer.perspective-config-update\n${logConfig(viewConfig)}\n${logConfig(viewerConfig)}`);
	
	// update view config state and create config change log
	let configChangeLog = '';
	Object.keys(viewerConfig).forEach(propertyName => {
		if (viewConfig[propertyName] === undefined || 
				viewConfig[propertyName] !== viewerConfig[propertyName]) {
			viewConfig[propertyName] = viewerConfig[propertyName];
			configChangeLog += `\n ${propertyName}: ${viewConfig[propertyName]}`;
		}
	});

	if (configChangeLog.length > 0 ) {
		logMessage(`viewer.perspective-config-update \n${configChangeLog}`);
		// save updated view config state for vscode data view panel reload
		vscode.setState({
			uri: dataUrl,
			table: dataTable, 
			config: viewConfig,
			theme: theme,
			views: dataViews
		});
		// notify data preview
		vscode.postMessage({
			command: 'config',
			table: dataTable,
			config: viewConfig
		});
	}
} // end of updateConfig()

/**
 * Deletes object property.
 * @param propertyName Property name to delete.
 */
function deleteProperty(propertyName, obj) {
	if (obj.hasOwnProperty(propertyName)) {
		delete obj[propertyName];
	}
}

/**
 * Updates data view on data file change.
 * @param data Refresh data json with doc uri, fileName and raw data to display.
 */
function refresh(data) {
	try {
		// initialize data view vars and UI elements
		dataUrl = data.uri;
		dataFileName = data.fileName;
		dataTable = data.table;
		dataViews = data.views;
		theme = data.theme;
		logLevel = data.logLevel;
		title.innerText = data.fileName;

		// load table list for multi-table data views display
		loadTableList(data.tableNames, dataTable);

		// load new data view config, if different
		reloadDataViewConfig(data.config);

		// load file data
		logMessage(`refresh(dataTable='${dataTable}')\n\n loading data: ${data.fileName} ...`);
		const tableData = getData(data.fileName, data.data, data.schema);
		if (Array.isArray(viewData) && viewData.length === 0) {
			// initialize perspective viewer
			logMessage(`refresh(dataTable='${dataTable}')\n\n initializing data view: ${data.fileName} ...`);
			if (data.schema && Object.keys(data.schema).length > 0) {
				// viewer.columns = viewConfig['columns'];
				viewer.load(data.schema);
				viewer.update(tableData);
			}
			else {
				viewer.load(tableData);
			}
			if (toggleConfig) {
				// show viewer toggles on the 1st run
				viewer.toggleConfig();
				toggleConfig = false;
				toggleDataViewConsoleDisplay();
			}
		} else {  // update viewer data without toggles reset
			logMessage(`refresh('${dataTable}')\n\n updating view data: ${data.fileName} ...`);
			viewer.clear();
			viewer.update(tableData);
		}
		updateStats();
		// save loaded view data for future data update checks
		viewData = tableData;
	} catch (error) {
		console.error(`data.view:refresh(): error: ${error.message}`);
	}
} // end of refresh(data)

/**
 * Loads data table names for multi-table data views display.
 * @param dataTableNames Data source table names array.
 * @param dataTable Requested data view table name.
 **/
function loadTableList(dataTableNames, dataTable) {
	if (tableNames.length <= 0) {
		logMessage(`loadTableList(\n tableNames = [${dataTableNames}]\n requestedDataTable = '${dataTable}'\n)`);
		dataTableNames.forEach(tableName => {
			tableSelector.innerHTML += `<option value="${tableName}">${tableName}</option>"`;
			tableNames.push(tableName);
		});
		if (tableNames.length > 0) {
			// show table selector dropdown
			tableSelector.style.display = 'inline-block';
			// set requested data table
			tableSelector.value = dataTable;
		}
	}
}

/**
 * Reloads data view config, resets view data and state
 * on new data view load, view config load, or data refresh.
 * @param dataViewConfig Data view config to load.
 **/
function reloadDataViewConfig(dataViewConfig) {
	// check view config
	if (JSON.stringify(viewConfig) !== JSON.stringify(dataViewConfig)) {
		logMessage(`reloadDataViewConfig(\n${logConfig(dataViewConfig)})`);
		// save updated view config
		viewConfig = dataViewConfig;
		// update data viewer for new view config display
		restoreConfig(viewConfig);
		// reset view data for reaload
		viewData = [];
		// update data view state
		vscode.setState({
			uri: dataUrl,
			table: dataTable,
			config: viewConfig,
			theme: theme,
			views: dataViews
		});
	}
}

/** 
 * Gets data for display in perspective viewer.
 * @param fileName Data file name.
 * @param data Raw text or json array data.
 * @param schema Optional data schema.
 **/
function getData(fileName, data, schema = {}) {
	let tableData = [];
	logMessage(`getData()\n\n loading file data: ${fileName} ...`);
	// read file data
	const fileExt = fileName.substr(fileName.lastIndexOf('.'));
	// TODO: rework this for large data files streaming
	switch (fileExt) {
		case '.md':
		case '.csv':
		case '.tsv':
		case '.txt':
		case '.tab':
			// pass through text data for data view to load
			tableData = data;
			// log records count, i.e. text lines - 1 (header) for text data in csv format
			const recordCount = data.split('\n').length - 1;
			logMessage(`getData()\n\n records count: ${recordCount.toLocaleString()}`);
			break;
		case '.xls':
		case '.xlsb':
		case '.xlsx':
		case '.xlsm':
		case '.ods':
		case '.dif':
		case '.xml':
		case '.html':
		case '.avro':
		case '.env':
		case '.properties':
		case '.config':
		case '.ini':
		case '.yaml':
		case '.yml':
		case '.json5':
		case '.hjson':
		case '.jsonl':
		case '.ndjson':
		case '.parquet':
			// pass through loaded data json
			tableData = data;
			logMessage(`getData()\n\n records count: ${tableData.length.toLocaleString()}`);
			break;
		case '.arrow':
			// return empty data array since binary data is loaded elsewhere
			tableData = [];
			logMessage(`getData()\n\n schema: ${JSON.stringify(schema, null, 2)}`);
			break;
		default: // json
			// pass through loaded data json
			tableData = data;
			logMessage(`getData()\n\n records count: ${tableData.length.toLocaleString()}`);
			break;
	}
	return tableData;
} // end of getData()


/*--------------------- Data View toolbar action handlers ----------------------*/

/**
 * Loads raw data source content on view data source button click.
 */
function viewDataSource() {
	vscode.postMessage({
		command: 'loadView',
		viewName: 'vscode.open',
		uri: `${dataUrl}`
	});
}

/**
 * Saves data view config, and filtered json or csv data.
 */
function saveData() {
	const dataFileType = saveFileTypeSelector.value;
	switch (dataFileType) {
		case '.config':
			const dataFileName = dataUrl.substr(dataUrl.lastIndexOf('/') + 1);
			const data = {
				dataFileName: dataFileName,
				dataTable: dataTable,
				config: parseConfig(viewConfig)
			};
			if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
				// append remote data uri
				data['dataUri'] = dataUrl;
			}
			postData(data, dataFileType);
			break;
		case '.arrow':
			viewer.view.to_arrow().then(arrayBuffer => {
				postArrowData(arrayBuffer, dataFileType);
			});
			break;
		case '.csv':
		case '.md':
			viewer.view.to_csv().then(csv => postData(csv, dataFileType));
			break;
		case '.json':
		case '.jsonl':
		case '.json5':
		case '.hjson':
		case '.ndjson':
		case '.html':
		case '.ods':
		case '.xml':
		case '.xlsb':
		case '.xlsx':
		case '.yml':
		case '.properties':
			viewer.view.to_json({date_format: 'en-US'}).then(json => postData(json, dataFileType));
			break;
	}
} // end of saveData()

/**
 * Parses data view config by converting config string properties 
 * to arrays and objects for the data viewer web component attributes.
 * @param viewConfig View config object to parse.
 */
function parseConfig(viewConfig) {
	// set new view config plugin attribute
	viewConfig['plugin'] = viewConfig['view'];
	// create clean view config instance
	const config = {};
	Object.keys(viewConfig).forEach(key => {
		config[key] = viewConfig[key];
		if (typeof viewConfig[key] === 'string') {
			const attribute = String(viewConfig[key]);
			if (attribute.startsWith('{') || attribute.startsWith('[')) {
				// parse config object or array
				config[key] = JSON.parse(attribute);
			}
		}
	});
	return config;
}

/**
 * Posts binary Arrow data for saving.
 * @param arrayBuffer Arrow data ArrayBuffer to save.
 * @param dataFileType Data file type to save: .arrow, .md, etc.
 */
function postArrowData(arrayBuffer, dataFileType) {
	const dataArray = new Uint8Array(arrayBuffer);
	postData(Array.from(dataArray), dataFileType);
}

/**
 * Posts Data View data for saving.
 * @param fileData File data to save.
 * @param dataFileType Data file type to save: .config, .arrow, .csv, .json(s), .md, .yml, etc.
 */
function postData(fileData, dataFileType) {
	vscode.postMessage({
		command:'saveData',
		data: fileData,
		fileType: dataFileType
	});
}

/**
 * Reloads view data.
 * @param dataTable Optional data table name for data files with multiple data sets.
 */
function reloadData(dataTable = '') {
	vscode.postMessage({
		command: 'refresh',
		table: dataTable
	});
}

/**
 * Loads requested table data for data files with multiple data sets.
 */
function loadTableData() {
	// get new table name selection from table selector list
	let tableName = tableSelector.value;
	if (!tableName || tableName === undefined) {
		// reset to empty for default data load
		dataTable = '';
	} else {
		// reset view data table and config for new data load
		dataTable = tableName;
		viewData = [];
		restoringConfig = true;
		viewConfig = {};
		viewer.reset();
		restoringConfig = false;
		viewer.clear();
		if (dataViews.hasOwnProperty(dataTable)) {
			viewConfig = dataViews[dataTable];
			restoreConfig(viewConfig);
		}
		vscode.postMessage({
			command: 'config',
			table: dataTable,
			config: viewConfig
		});
	}
	reloadData(dataTable);
}

/**
 * Launches new data preview.
 */
function loadDataPreview() {
	let documentUri = dataUrl; // for new data.preview launch
	// check if loaded data view is for a view config file
	if (dataUrl.endsWith('.config') && 
			viewData.length > 0 &&
			viewData[0].hasOwnProperty('key') && 
			viewData[0].hasOwnProperty('value')) {
		// extract data file name from config to load that data view
		const dataViewFileName = viewData.find(config => config.key === 'dataFileName');
		const view = viewData.find(config => config.key === 'config.view');
		if (view !== undefined && dataViewFileName !== undefined) {
			// must be our data.view config: swap it out to load that data
			documentUri = dataUrl.replace(dataFileName, dataViewFileName.value);
		}
	} 
	// launch new data preview
	vscode.postMessage({
		command: 'loadView',
		viewName: 'data.preview',
		uri: documentUri
	});
}

/**
 * Launches new data preview for entered url in data url input textbox.
 */
function loadDataPreviewForUrl(e) {
	if (!e) e = window.event;
	const keyCode = e.keyCode || e.which;
	if (keyCode == '13') {
		const url = dataUrlInput.value;
		// launch new data preview
		vscode.postMessage({
			command: 'loadView',
			viewName: 'data.preview',
			uri: url
		});
	}
}

/**
 * Opens file dialog to launch new data preview
 * for the selected data file from the supported data formats list.
 **/
function openFile() {
	vscode.postMessage({command: 'openFile'});
}

/**
 * Loads data preview help in a browser window.
 */
function loadHelp() {
	vscode.postMessage({
		command: 'loadView',
		viewName: 'vscode.open',
		uri: 'https://github.com/RandomFractals/vscode-data-preview#usage-tips'
	});
}

/**
 * Loads ko-fi sponsor button page in a browser window.
 */
function buyCoffee() {
	vscode.postMessage({
		command: 'buyCoffee',
		viewName: 'vscode.open',
		uri: 'https://ko-fi.com/datapixy'
	});
}

/**
 * Opens load data view config file dialog.
 */
function loadConfig() {
	vscode.postMessage({command:'loadConfig'});
}

/**
 * Rolls back last view config changes.
 */
function undoConfig() {
	vscode.postMessage({command:'undoConfig'});
}

/**
 * Applies next view config changes
 * in the recorded view config changes stack.
 */
function redoConfig() {
	vscode.postMessage({command:'redoConfig'});
}

/**
 * Logs new data.view message to console for more info or debug.
 * @param message Log message text.
 * @param logLevel Optional log level type.
 */
function logMessage(message, logLevel = 'debug') {
	const category = 'data.view:';
	switch (logLevel) {
		case 'warn':
			console.warn(category + message);
			break;
		case 'info':
			console.info(category + message);
			break;
		case 'error':
			console.error(category + message);
			break;
		default: // debug
			console.log(category + message);
			break;
	}
	if (dataViewConsoleText) {
		// log data view message to text console for display
		dataViewConsoleText.value += `${message}\n\n> `;
	}
}

/**
 * Converts data view config to string for console log display.
 * @param dataViewConfig Data view config object or string.
 */
function logConfig(dataViewConfig) {
	return (typeof dataViewConfig === 'string') ? dataViewConfig: JSON.stringify(dataViewConfig, null, 2);
}

/**
 * Toggles data view console text display
 * with data loading or config/data refresh debug messages
 * for issues troubleshooting and dev.
 */
function toggleDataViewConsoleDisplay() {
	// toggle data view console display
	dataViewConsoleText.style.display = (dataViewConsoleText.style.display === 'none') ? 'block': 'none';
}

/**
 * Checks web client web assembly support.
 */
function supportsWebAssembly() {
	try {
		if (typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function') {
			const module = new WebAssembly.Module(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
			if (module instanceof WebAssembly.Module) {
				return new WebAssembly.Instance(module) instanceof WebAssembly.Instance;
			}
		}
	} catch (e) {}
	return false;
}
