var NWC = NWC || {};

NWC.view = NWC.view || {};

/*
 * View for the water budget huc data page
 * @constructor extends NWC.BaseView
 */

NWC.view.WaterBudgetHucDataView = NWC.view.BaseView.extend({

	templateName : 'waterbudgetHucData',

	ETA : "eta",
	DAY_MET : "dayMet",
	DAILY : "daily",
	MONTHLY : "monthly",
	METRIC : "metric",
	CUSTOMARY : "usCustomary",

	events: {
		'click .back-button' : 'goToWaterbudget',
		'click .counties-button' : 'displayCountyMap',
		'click .metric-button' : 'toggleMetricLegend',
		'click .customary-button' : 'toggleCustomaryLegend',
		'click .monthly-button' : 'toggleMonthlyLegend',
		'click .daily-button' : 'toggleDailyLegend',
		'click .evapotranspiration-download-button' : 'downloadEvapotranspiration',
		'click .precipitation-download-button' : 'downloadPrecipitation'
	},

	context : {
	},

	initialize : function(options) {

		this.context.hucId = options.hucId;
		this.hucId = options.hucId;
		this.insetMapDiv = options.insetMapDiv;

		// call superclass initialize to do default initialize
		// (includes render)
		NWC.view.BaseView.prototype.initialize.apply(this, arguments);

		this.buildMap(this.hucId);
		this.getHucData(this.hucId);
		this.map.render(this.insetMapDiv);
	},

	buildMap : function(huc) {

		var baseLayer = NWC.util.mapUtils.createWorldStreetMapLayer();

		this.map = NWC.util.mapUtils.createMap([baseLayer], [new OpenLayers.Control.Zoom(), new OpenLayers.Control.Navigation()]);

		this.hucLayer = NWC.util.mapUtils.createHucFeatureLayer(huc);

		this.hucLayer.events.on({
			featureadded: function(event){
				this.hucName = event.feature.attributes.HU_12_NAME;
				this.map.zoomToExtent(this.hucLayer.getDataExtent());

				$('#huc-name').html(event.feature.attributes.HU_12_NAME);
				this.$(".evapotranspiration-download-button").removeAttr("disabled");			
				this.$(".precipitation-download-button").removeAttr("disabled");			
			},
			loadend: function(event) {
				$('#loading-indicator').hide();
			},
			scope : this
		});

		this.map.addLayer(this.hucLayer);
		this.map.zoomToExtent(this.map.getMaxExtent());

		return;
	},

	/**
	 * This makes a Web service call to get huc data
	 * then makes call to render the data on a plot
	 * @param {String} huc 12 digit identifier for the hydrologic unit
	 */
	getHucData: function(huc) {
		var labeledResponses = {};
		var labeledAjaxCalls = [];
		//grab the sos sources that will be used to display the initial data
		//series. ignore other data sources that the user can add later.
		var initialSosSourceKeys = [this.ETA, this.DAY_MET];
		var initialSosSources = Object.select(NWC.util.SosSources, initialSosSourceKeys);
		Object.keys(initialSosSources, function (sourceId, source) {
			var d;
			d = $.Deferred();
			labeledAjaxCalls.push(d);
			var url = NWC.util.buildSosUrlFromSource(huc, source);
			$.ajax({
				url : url,
				success : function(data, textStatus, jqXHR) {
					var label = this.valueOf();
					var parsedValues = NWC.util.SosResponseFormatter.formatSosResponse(data);
					var labeledDataSeries = NWC.util.DataSeries.newSeries();
					labeledDataSeries.metadata.seriesLabels.push(
						{
							seriesName: NWC.util.SosSources[label].propertyLongName,
							seriesUnits: NWC.util.SosSources[label].units
						}
					);
					labeledDataSeries.metadata.downloadHeader = NWC.util.SosSources[label].downloadMetadata;
					labeledDataSeries.data = parsedValues;
					labeledResponses[label] = labeledDataSeries;
					d.resolve();
				},
				context : sourceId,
				dataType : "xml",
				error : function() {
                    //@todo - setup app level error handling
                    var errorMessage = 'error retrieving time series data';
                    alert(errorMessage);
                    d.reject();
				}
			});
        });
		var dataHandler = function() {
			this.dataSeriesStore.updateHucSeries(labeledResponses);
			this.plotPTandETaData(this.DAILY, this.CUSTOMARY);
		}.bind(this);
		$.when.apply(null, labeledAjaxCalls).then(dataHandler);
		return;
	},

    /**
     * {String} measurement, the quantity scale of data to plot (usCustomary or metric)
     * {String} time, the time scale of data to plot (daily or monthly)
     */
	plotPTandETaData : function(time, measurement) {
        var plotDivSelector = '#waterBudgetPlot';
        var legendDivSelector = '#waterBudgetLegend';
        var normalization = 'normalizedWater';
        var plotTimeDensity  = time;
        var measurementSystem =  measurement;
        var values = this.dataSeriesStore[plotTimeDensity].getDataAs(measurementSystem, normalization);
        var labels = this.dataSeriesStore[plotTimeDensity].getSeriesLabelsAs(
                measurementSystem, normalization, plotTimeDensity);
        var ylabel = NWC.util.Units[measurementSystem][normalization][plotTimeDensity];
        NWC.util.Plotter.getPlot(plotDivSelector, legendDivSelector, values, labels, ylabel);
        return;
	},

	displayCountyMap : function() {
		return;
	},

	toggleMetricLegend : function() {
		$(".customary-button").removeAttr("disabled");
		$(".metric-button").attr("disabled","disabled");
		if ($(".daily-button").attr("disabled")) {
			this.plotPTandETaData(this.DAILY, this.METRIC);
		}
		else {
			this.plotPTandETaData(this.MONTHLY, this.METRIC);
		}
	},

	toggleCustomaryLegend : function() {
		$(".metric-button").removeAttr("disabled");
		$(".customary-button").attr("disabled","disabled");
		if ($(".daily-button").attr("disabled")) {
			this.plotPTandETaData(this.DAILY, this.CUSTOMARY);
		}
		else {
			this.plotPTandETaData(this.MONTHLY, this.CUSTOMARY);
		}
	},

	toggleMonthlyLegend : function() {
		$(".daily-button").removeAttr("disabled");
		$(".monthly-button").attr("disabled","disabled");
		if ($(".customary-button").attr("disabled")) {
			this.plotPTandETaData(this.MONTHLY, this.CUSTOMARY);
		}
		else {
			this.plotPTandETaData(this.MONTHLY, this.METRIC);
		}
	},

	toggleDailyLegend : function() {
		$(".daily-button").attr("disabled","disabled");
		$(".monthly-button").removeAttr("disabled");
		if (this.$(".customary-button").attr("disabled")) {
			this.plotPTandETaData(this.DAILY, this.CUSTOMARY);
		}
		else {
			this.plotPTandETaData(this.DAILY, this.METRIC);
		}
	},

	downloadEvapotranspiration : function() {
		var blob = new Blob([this.dataSeriesStore.eta.toCSV()], {type:'text/csv'});
		saveAs(blob, this.getHucFilename('eta'));
		return;
	},

	downloadPrecipitation : function() {
		var blob = new Blob([this.dataSeriesStore.dayMet.toCSV()], {type:'text/csv'});
		saveAs(blob, this.getHucFilename('dayMet'));	
		return;
	},

	getHucFilename : function (series) {
		var filename = series + '_data.csv';
        if (this.hucName && this.hucId) {
        	filename = this.buildName(this.hucName, this.hucId, series);
        }
		return filename;
	},

	buildName : function(selectionName, selectionId, series) {
		var filename = selectionName;
		filename += '_' + selectionId;
		filename += '_' + series;
		filename += '.csv';
		filename = filename.replace(/ /g, '_');
		filename = escape(filename);
		return filename;
	}

});