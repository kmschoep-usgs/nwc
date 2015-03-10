var NWC = NWC || {};

NWC.util = NWC.util || {};

NWC.util.mapUtils = (function () {

	var that = {};

	that.WGS84_GOOGLE_MERCATOR = new OpenLayers.Projection("EPSG:3857");
	that.WGS84_GEOGRAPHIC = new OpenLayers.Projection("EPSG:4326");

	var EPSG3857Options = {
		sphericalMercator: true,
		layers: "0",
		isBaseLayer: true,
		projection: that.WGS84_GOOGLE_MERCATOR,
		units: "m",
		buffer: 3,
		transitionEffect: 'resize',
		wrapDateLine: true
	};
	var zyx = '/MapServer/tile/${z}/${y}/${x}';

	that.createWorldStreetMapLayer = function() {
		return new OpenLayers.Layer.XYZ(
			"World Street Map",
			"http://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map" + zyx,
			{
				isBaseLayer: true,
				units: "m",
				wrapDateLine: true
			}
		);
	};

	that.createWorldGrayBaseLayer = function() {
		return new OpenLayers.Layer.XYZ(
			"World Light Gray Base",
			"http://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base" + zyx,
			Object.merge(EPSG3857Options, {numZoomLevels: 14})
		);
	};

	that.createWorldTopoLayer = function() {
		return new OpenLayers.Layer.XYZ(
			"World Topo Map",
			"http://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map" + zyx,
			{
				isBaseLayer: true,
				units: "m",
				wrapDateLine: true
			}
		);
	};

	that.createWorldImageryLayer = function() {
		return new OpenLayers.Layer.XYZ(
			"World Imagery",
			"http://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery" + zyx,
			{
				isBaseLayer: true,
				units: "m",
				wrapDateLine: true
			}
		);
	};

	that.createWorldShadedReliefLayer = function() {
		return new OpenLayers.Layer.XYZ(
			"World Terrain Base",
			"http://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief" + zyx,
			Object.merge(EPSG3857Options, {numZoomLevels: 14})
		);
	};

	that.createAllBaseLayers = function() {
		return [
			that.createWorldStreetMapLayer(),
			that.createWorldGrayBaseLayer(),
			that.createWorldTopoLayer(),
			that.createWorldImageryLayer(),
			that.createWorldShadedReliefLayer()
		];
	};

	that.transformWGS84ToMercator = function(lonLat) {
		return lonLat.transform(that.WGS84_GEOGRAPHIC, that.WGS84_GOOGLE_MERCATOR);
	}

	that.createMap = function(layers, controls) {
		var maxExtent = that.transformWGS84ToMercator(new OpenLayers.Bounds(-179.0, 10.0, -42.0, 75.0));
        var initialExtent = that.transformWGS84ToMercator(new OpenLayers.Bounds(-165.0, 10.0, -65.0, 65.0));

		var defaultConfig = {
            extent: initialExtent,
            restrictedExtent: maxExtent,
            projection: that.WGS84_GOOGLE_MERCATOR,
            numZoomLevels: 13
        };
		defaultConfig.layers = layers;
		defaultConfig.controls = controls;

		return new OpenLayers.Map(defaultConfig);
	};

	that.defaultWorkflowLayerProperties = {
		opacity: 0.6,
		displayInLayerSwitcher: false,
		visibility: true,
		isBaseLayer: false,
		tiled: true
	};

	that.createHucLayer = function(config) {
		return new OpenLayers.Layer.WMS('National WBD Snapshot',
			CONFIG.endpoint.geoserver + 'ows?',
			{
				layers: 'NHDPlusHUCs:NationalWBDSnapshot',
				transparent: true,
				styles: ['polygon'],
				tiled: true
			},
			$.extend({}, that.defaultWorkflowLayerProperties, config)
		);
	};

	that.addFlowLinesToMap = function(map) {
		var streamOrderClipValues = [
			7, // 0
			7,
			7,
			6,
			6,
			6, // 5
			5,
			5,
			5,
			4,
			4, // 10
			4,
			3,
			3,
			3,
			2, // 15
			2,
			2,
			1,
			1,
			1 // 20
		];
		var streamOrderClipValue = 0;
		var flowlineAboveClipPixel;
		var createFlowlineColor = function(r,g,b,a) {
			flowlineAboveClipPixel = (a & 0xff) << 24 | (b & 0xff) << 16 | (g & 0xff) << 8 | (r & 0xff);
		};
		createFlowlineColor(100,100,255,255);
		streamOrderClipValue = streamOrderClipValues[map.zoom];

		map.events.register(
			'zoomend',
			map,
			function() {
				streamOrderClipValue = streamOrderClipValues[map.zoom];
			},
			true
		);

		// define per-pixel operation
		var flowlineClipOperation = OpenLayers.Raster.Operation.create(function(pixel) {
			if (pixel >> 24 === 0) { return 0; }
			var value = pixel & 0x00ffffff;
			if (value >= streamOrderClipValue && value < 0x00ffffff) {
				return flowlineAboveClipPixel;
			} else {
				return 0;
			}
		});

		var flowlinesWMSData = new OpenLayers.Layer.FlowlinesData(
			"Flowline WMS (Data)",
			CONFIG.endpoint.geoserver + 'gwc/service/wms'
		);
		map.addLayer(flowlinesWMSData);

		// source canvas (writes WMS tiles to canvas for reading)
		var flowlineComposite = OpenLayers.Raster.Composite.fromLayer(flowlinesWMSData, {int32: true});

		// filter source data through per-pixel operation
		var flowlineClipOperationData = flowlineClipOperation(flowlineComposite);

		var flowLayerName = "NHD Flowlines"
		var flowlineRaster = new OpenLayers.Layer.Raster({
			name: flowLayerName,
			data: flowlineClipOperationData,
			isBaseLayer: false,
			visibility : true
		});

		// add the special raster layer to the map viewport
		map.addLayer(flowlineRaster);
	};

	return that;
}());


